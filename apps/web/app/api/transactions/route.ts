import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'
import { DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/defaultCategories'
import { findDuplicateTransaction } from '@/lib/transactionDuplicates'

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

const NO_BALANCE_SYNC_MARKER = '[[KABLUS_NO_BALANCE_SYNC]]'

function getLocalTodayDateString() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeDateInput(date: string) {
  return date.includes('T') ? date.split('T')[0] ?? date : date
}

function isTodayTransaction(date: string) {
  return normalizeDateInput(date) === getLocalTodayDateString()
}

function shouldApplyBalanceAdjustment(date: string, requested?: boolean) {
  if (isTodayTransaction(date)) {
    return true
  }

  return Boolean(requested)
}

function serializeNotes(notes: string | undefined, applyBalanceAdjustment: boolean) {
  const cleaned = (notes || '').replace(NO_BALANCE_SYNC_MARKER, '').trim()

  if (applyBalanceAdjustment) {
    return cleaned || null
  }

  return cleaned ? `${cleaned}\n${NO_BALANCE_SYNC_MARKER}` : NO_BALANCE_SYNC_MARKER
}

function stripInternalNotes(notes?: string | null) {
  if (!notes) return null

  const cleaned = notes.replace(NO_BALANCE_SYNC_MARKER, '').trim()
  return cleaned || null
}

function transactionAffectsBalance(transaction: { notes?: string | null }) {
  return !transaction.notes?.includes(NO_BALANCE_SYNC_MARKER)
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function getDayRange(date: string) {
  const normalized = new Date(date)

  if (Number.isNaN(normalized.getTime())) {
    return null
  }

  const start = new Date(normalized)
  start.setHours(0, 0, 0, 0)

  const end = new Date(normalized)
  end.setHours(23, 59, 59, 999)

  return { start, end }
}

async function findExistingDuplicate(userId: string, body: TransactionData, transactionAmount: number) {
  const dayRange = getDayRange(body.date)

  if (!dayRange) {
    return null
  }

  const candidates = await prisma.transaction.findMany({
    where: {
      userId,
      type: body.type,
      date: {
        gte: dayRange.start,
        lte: dayRange.end,
      },
      ...((body.type === 'transfer' || body.type === 'exchange')
        ? {
            fromAccountId: body.fromAccountId || null,
            toAccountId: body.toAccountId || null,
          }
        : {
            accountId: body.accountId || null,
          }),
    },
    select: {
      id: true,
      accountId: true,
      fromAccountId: true,
      toAccountId: true,
      date: true,
      description: true,
      type: true,
      amount: true,
      currency: true,
    },
  })

  return findDuplicateTransaction(
      {
        accountId: body.accountId,
        fromAccountId: body.fromAccountId,
        toAccountId: body.toAccountId,
        date: body.date,
        description: body.description,
        type: body.type,
        amount: transactionAmount,
        currency: body.currency,
        ignoreDescription: true,
      },
      candidates
    )
}

async function findCategoryForUser(userId: string, categoryKey: string) {
  try {
    return await prisma.transactionCategory.findFirst({
      where: {
        key: categoryKey,
        OR: [{ userId }, { userId: null }],
      },
    })
  } catch {
    const legacyRows = await prisma.$queryRawUnsafe<Array<{
      id: string
      name: string
      key: string
      icon: string | null
      createdAt: Date
    }>>(
      'SELECT "id", "name", "key", "icon", "createdAt" FROM "TransactionCategory" WHERE "key" = $1 LIMIT 1',
      categoryKey
    )

    const category = legacyRows[0]
    if (category) {
      return category
    }
    return DEFAULT_TRANSACTION_CATEGORIES.find((item) => item.key === categoryKey) ?? null
  }
}

async function getCategoryMapSafely(userId: string) {
  try {
    const categories = await ensureDefaultCategories(userId)

    return new Map(
      categories.map((category) => [
        category.key,
        {
          key: category.key,
          name: category.name,
          icon: 'icon' in category ? category.icon : null,
          color: 'color' in category ? category.color : null,
          type: 'type' in category ? category.type : 'expense',
        },
      ])
    )
  } catch (error) {
    console.error('Failed to resolve transaction categories:', error)
    return new Map()
  }
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const [transactions, categoryMap] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        include: {
          account: { select: { id: true, name: true, currency: true } },
          fromAccount: { select: { id: true, name: true, currency: true } },
          toAccount: { select: { id: true, name: true, currency: true } },
        },
      }),
      getCategoryMapSafely(userId),
    ])

    return NextResponse.json(
      transactions.map((transaction) => ({
        ...transaction,
        notes: stripInternalNotes(transaction.notes),
        category: transaction.categoryKey ? categoryMap.get(transaction.categoryKey) ?? null : null,
      }))
    )
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
    const applyBalance = shouldApplyBalanceAdjustment(date, applyBalanceAdjustment)
    const storedNotes = serializeNotes(notes, applyBalance)

    if (!date || !description || !type || !currency || Number.isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 })
    }

    if (type === 'transfer' || type === 'exchange') {
      const { fromAccountId, toAccountId } = body

      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        return NextResponse.json({ error: type === 'exchange' ? 'Invalid exchange accounts' : 'Invalid transfer accounts' }, { status: 400 })
      }

      const [fromAccount, toAccount, duplicateTransaction, category] = await Promise.all([
        prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
        prisma.account.findFirst({ where: { id: toAccountId, userId } }),
        findExistingDuplicate(userId, body, transactionAmount),
        categoryKey ? findCategoryForUser(userId, categoryKey) : Promise.resolve(null),
      ])

      if (!fromAccount || !toAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (categoryKey && !category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 })
      }

      if (duplicateTransaction) {
        return NextResponse.json(
          {
            error: '이미 같은 날짜, 금액, 유형, 내용의 거래가 등록되어 있습니다.',
            duplicate: true,
            transactionId: duplicateTransaction.id,
          },
          { status: 409 }
        )
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

      if (applyBalance) {
        const newFromBalance = fromAccount.type === 'credit_card'
          ? fromAccount.balance + transactionAmount
          : fromAccount.balance - transactionAmount
        const newToBalance = toAccount.type === 'credit_card'
          ? toAccount.balance - creditedAmount
          : toAccount.balance + creditedAmount

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
            categoryKey: categoryKey || 'transfer',
            exchangeToAmount: type === 'exchange' ? exchangeToAmount : null,
            exchangeToCurrency: type === 'exchange' ? exchangeToCurrency : null,
            exchangeRateApplied: type === 'exchange' ? exchangeRateApplied : null,
            notes: storedNotes,
          } as any,
        })
      )

      const created = await prisma.$transaction(transactionOperations)
      const newTransaction = created[created.length - 1]

      return NextResponse.json(newTransaction, { status: 201 })
    }

    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: 'Account is required' }, { status: 400 })
    }

    const [account, duplicateTransaction, category] = await Promise.all([
      prisma.account.findFirst({
        where: { id: accountId, userId },
      }),
      findExistingDuplicate(userId, body, transactionAmount),
      categoryKey ? findCategoryForUser(userId, categoryKey) : Promise.resolve(null),
    ])

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (categoryKey && !category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 400 })
    }

    if (duplicateTransaction) {
      return NextResponse.json(
        {
          error: '이미 같은 날짜, 금액, 유형, 내용의 거래가 등록되어 있습니다.',
          duplicate: true,
          transactionId: duplicateTransaction.id,
        },
        { status: 409 }
      )
    }

    const transactionOperations = []

    if (applyBalance) {
      const newBalance = account.type === 'credit_card'
        ? type === 'income'
          ? account.balance - transactionAmount
          : account.balance + transactionAmount
        : type === 'income'
          ? account.balance + transactionAmount
          : account.balance - transactionAmount

      transactionOperations.push(
        prisma.account.update({ where: { id: accountId }, data: { balance: newBalance } }),
      )
    }

    transactionOperations.push(
      prisma.transaction.create({
        data: {
          userId,
          accountId,
          date: new Date(date),
          description,
          type,
          amount: type === 'expense' ? -transactionAmount : transactionAmount,
          currency,
          categoryKey,
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
