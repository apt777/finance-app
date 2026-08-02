import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { getCachedCategoryMap } from '@/lib/categories'
import { ensureDueRecurringTransactionsProcessed } from '@/lib/recurring'
import { resolveTransactionBaseSnapshot } from '@/lib/transactionBaseSnapshot'
import { getUserTimeZone } from '@/lib/user-timezone'
import { calculateNextAccountBalance, calculateTransferAccountBalance } from '@/lib/accountBalance'
import {
  serializeNotes,
  shouldApplyBalanceAdjustment,
  stripInternalNotes,
  transactionAffectsBalance,
} from '@/lib/transactionPersistence'

interface TransactionData {
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  date: string
  description: string
  type: 'income' | 'expense' | 'transfer' | 'exchange'
  amount: number
  currency: string
  exchangeToAmount?: number
  exchangeToCurrency?: string
  exchangeRateApplied?: number
  categoryKey?: string
  notes?: string
  applyBalanceAdjustment?: boolean
}

function summarizeTransactions(
  transactions: Array<{
    type: string
    amount: number
    baseAmountSnapshot: number | null
  }>,
) {
  return transactions.reduce(
    (summary, transaction) => {
      const normalizedAmount =
        typeof transaction.baseAmountSnapshot === 'number'
          ? transaction.baseAmountSnapshot
          : transaction.amount

      if (transaction.type === 'income') {
        summary.income += Math.max(0, normalizedAmount)
      }

      if (transaction.type === 'expense') {
        summary.expense += Math.abs(normalizedAmount)
      }

      summary.net = summary.income - summary.expense
      return summary
    },
    { income: 0, expense: 0, net: 0 },
  )
}

function normalizeDateInput(date: string) {
  return date.includes('T') ? date.split('T')[0] ?? date : date
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function getCategoryMapSafely(userId: string) {
  try {
    return await getCachedCategoryMap(userId)
  } catch (error) {
    console.error('Failed to resolve transaction categories:', error)
    return new Map()
  }
}

async function resolveCategorySelection(userId: string, categoryValue?: string | null) {
  if (!categoryValue) {
    return null
  }

  const categoryMap = await getCategoryMapSafely(userId)
  const directMatch = categoryMap.get(categoryValue)
  if (directMatch) {
    return directMatch
  }

  const normalizedValue = categoryValue.trim().toLowerCase()
  return (
    Array.from(categoryMap.values()).find((category) => {
      return (
        category.name.trim().toLowerCase() === normalizedValue ||
        category.key.trim().toLowerCase() === normalizedValue
      )
    }) ?? null
  )
}

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

export async function GET(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    await ensureDueRecurringTransactionsProcessed(userId)
    const { searchParams } = new URL(request.url)
    const page = parsePositiveInteger(searchParams.get('page'), 1)
    const pageSizeParam = searchParams.get('pageSize')
    const showAll = pageSizeParam === 'all'
    const pageSize = showAll ? null : parsePositiveInteger(pageSizeParam, 30)
    const skip = showAll || !pageSize ? 0 : (page - 1) * pageSize
    const take = showAll || !pageSize ? undefined : pageSize

    const [transactions, total, categoryMap, summaryTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: {
          account: { select: { id: true, name: true, currency: true } },
          fromAccount: { select: { id: true, name: true, currency: true } },
          toAccount: { select: { id: true, name: true, currency: true } },
        },
      }),
      prisma.transaction.count({
        where: { userId },
      }),
      getCategoryMapSafely(userId),
      prisma.transaction.findMany({
        where: { userId },
        select: {
          type: true,
          amount: true,
          baseAmountSnapshot: true,
        },
      }),
    ])

    const serializedTransactions = transactions.map((transaction) => ({
        ...transaction,
        notes: stripInternalNotes(transaction.notes),
        category: transaction.categoryKey ? categoryMap.get(transaction.categoryKey) ?? null : null,
      }))

    return NextResponse.json({
      transactions: serializedTransactions,
      total,
      page,
      pageSize: showAll ? 'all' : pageSize ?? 30,
      hasMore: showAll ? false : skip + serializedTransactions.length < total,
      summary: summarizeTransactions(summaryTransactions),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const body: TransactionData = await request.json()
    const { date, description, type, amount: rawAmount, currency, categoryKey, notes, applyBalanceAdjustment } = body
    const transactionAmount = Number(rawAmount)
    const resolvedCategory = await resolveCategorySelection(userId, categoryKey)
    const normalizedCategoryKey = resolvedCategory?.key || categoryKey
    const needsCurrentRates =
      currency !== 'JPY' ||
      (type === 'exchange' && (body.exchangeToCurrency || 'JPY') !== 'JPY')
    const currentRates = needsCurrentRates
      ? await prisma.exchangeRate.findMany({
          where: { userId },
          select: {
            fromCurrency: true,
            toCurrency: true,
            rate: true,
          },
        })
      : []

    if (!date || !description || !type || !currency || Number.isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 })
    }

    if (type === 'transfer' || type === 'exchange') {
      const { fromAccountId, toAccountId } = body

      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        return NextResponse.json({ error: type === 'exchange' ? 'Invalid exchange accounts' : 'Invalid transfer accounts' }, { status: 400 })
      }

      const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
        prisma.account.findFirst({ where: { id: toAccountId, userId } }),
      ])

      if (!fromAccount || !toAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (categoryKey && !resolvedCategory) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 })
      }

      const transactionOperations = []
      const exchangeToAmount = Number(body.exchangeToAmount)
      const creditedAmount = type === 'exchange' ? exchangeToAmount : transactionAmount
      const exchangeToCurrency = body.exchangeToCurrency || toAccount.currency
      const exchangeRateApplied = body.exchangeRateApplied
        ? Number(body.exchangeRateApplied)
        : type === 'exchange' && Number.isFinite(exchangeToAmount) && transactionAmount > 0
          ? exchangeToAmount / transactionAmount
          : null

      if (type === 'exchange' && (!Number.isFinite(exchangeToAmount) || exchangeToAmount <= 0)) {
        return NextResponse.json({ error: 'Invalid exchange amount' }, { status: 400 })
      }

      const userTimeZone = await getUserTimeZone(userId)
      const applyBalance = shouldApplyBalanceAdjustment(date, userTimeZone, applyBalanceAdjustment)
      const storedNotes = serializeNotes(notes, applyBalance)
      const snapshot = await resolveTransactionBaseSnapshot({
        date,
        amount: transactionAmount,
        currency,
        exchangeToAmount: type === 'exchange' ? exchangeToAmount : null,
        exchangeToCurrency: type === 'exchange' ? exchangeToCurrency : null,
        userTimeZone,
        currentRates,
      })

      if (applyBalance) {
        const newFromBalance = calculateTransferAccountBalance(fromAccount.balance, fromAccount.type, 'from', transactionAmount)
        const newToBalance = calculateTransferAccountBalance(toAccount.balance, toAccount.type, 'to', creditedAmount)

        transactionOperations.push(
          prisma.account.update({ where: { id: fromAccountId }, data: { balance: newFromBalance } }),
          prisma.account.update({ where: { id: toAccountId }, data: { balance: newToBalance } }),
        )
      }

      transactionOperations.push(
        prisma.transaction.create({
          data: {
            userId,
            fromAccountId,
            toAccountId,
            date: new Date(date),
            description,
            type,
            amount: transactionAmount,
            currency,
            categoryKey: normalizedCategoryKey || 'transfer',
            exchangeToAmount: type === 'exchange' ? exchangeToAmount : null,
            exchangeToCurrency: type === 'exchange' ? exchangeToCurrency : null,
            exchangeRateApplied: type === 'exchange' ? exchangeRateApplied : null,
            baseCurrencySnapshot: snapshot.baseCurrencySnapshot,
            baseAmountSnapshot: snapshot.baseAmountSnapshot,
            exchangeToBaseAmountSnapshot: snapshot.exchangeToBaseAmountSnapshot,
            snapshotRateApplied: snapshot.snapshotRateApplied,
            snapshotRateDate: snapshot.snapshotRateDate,
            snapshotRateSource: snapshot.snapshotRateSource,
            notes: storedNotes,
          } as any,
        })
      )

      const created = await prisma.$transaction(transactionOperations)
      const newTransaction = created[created.length - 1]

      return NextResponse.json(newTransaction, { status: 201 })
    }
    const { accountId } = body

    if (categoryKey && !resolvedCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 })
    }

    const account = accountId
      ? await prisma.account.findFirst({
          where: { id: accountId, userId },
        })
      : null

    if (accountId && !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const userTimeZone = await getUserTimeZone(userId)
    const applyBalance = account ? shouldApplyBalanceAdjustment(date, userTimeZone, applyBalanceAdjustment) : false
    const storedNotes = serializeNotes(notes, applyBalance)
    const signedAmount = type === 'expense' ? -transactionAmount : transactionAmount
    const snapshot = await resolveTransactionBaseSnapshot({
      date,
      amount: signedAmount,
      currency,
      userTimeZone,
      currentRates,
    })

    const transactionOperations = []

    if (account && applyBalance) {
      const newBalance = calculateNextAccountBalance(account.balance, account.type, type as 'income' | 'expense', transactionAmount)

      transactionOperations.push(
        prisma.account.update({ where: { id: accountId }, data: { balance: newBalance } }),
      )
    }

    transactionOperations.push(
      prisma.transaction.create({
        data: {
          userId,
          accountId: accountId || null,
          date: new Date(date),
          description,
          type,
          amount: signedAmount,
          currency,
          categoryKey: normalizedCategoryKey,
          baseCurrencySnapshot: snapshot.baseCurrencySnapshot,
          baseAmountSnapshot: snapshot.baseAmountSnapshot,
          exchangeToBaseAmountSnapshot: snapshot.exchangeToBaseAmountSnapshot,
          snapshotRateApplied: snapshot.snapshotRateApplied,
          snapshotRateDate: snapshot.snapshotRateDate,
          snapshotRateSource: snapshot.snapshotRateSource,
          notes: storedNotes,
        },
      }),
    )

    const created = await prisma.$transaction(transactionOperations)
    const newTransaction = created[created.length - 1]

    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        id: { in: ids },
        userId,
      },
      include: {
        account: true,
        fromAccount: true,
        toAccount: true,
      },
    })

    await prisma.$transaction(async (tx) => {
      for (const transaction of transactions) {
        if (!transactionAffectsBalance(transaction)) {
          continue
        }

        if ((transaction.type === 'transfer' || transaction.type === 'exchange') && transaction.fromAccount && transaction.toAccount) {
          const creditedAmount = transaction.type === 'exchange'
            ? Math.abs((transaction as any).exchangeToAmount || 0)
            : Math.abs(transaction.amount)
          const restoredFromBalance = transaction.fromAccount.type === 'credit_card'
            ? transaction.fromAccount.balance - Math.abs(transaction.amount)
            : transaction.fromAccount.balance + Math.abs(transaction.amount)
          const restoredToBalance = transaction.toAccount.type === 'credit_card'
            ? transaction.toAccount.balance + creditedAmount
            : transaction.toAccount.balance - creditedAmount

          await tx.account.update({
            where: { id: transaction.fromAccount.id },
            data: { balance: restoredFromBalance },
          })
          await tx.account.update({
            where: { id: transaction.toAccount.id },
            data: { balance: restoredToBalance },
          })
          continue
        }

        if (transaction.account) {
          const restoredBalance = transaction.account.type === 'credit_card'
            ? transaction.account.balance + transaction.amount
            : transaction.account.balance - transaction.amount

          await tx.account.update({
            where: { id: transaction.account.id },
            data: { balance: restoredBalance },
          })
        }
      }

      await tx.transaction.deleteMany({
        where: {
          id: { in: transactions.map((transaction) => transaction.id) },
          userId,
        },
      })
    })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete transactions' }, { status: 500 })
  }
}
