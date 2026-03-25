import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/defaultCategories'

const NO_BALANCE_SYNC_MARKER = '[[KABLUS_NO_BALANCE_SYNC]]'

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

async function findCategoryForUser(userId: string, categoryKey: string) {
  try {
    return await prisma.transactionCategory.findFirst({
      where: {
        key: categoryKey,
        OR: [{ userId }, { isDefault: true, userId: null }],
      },
    })
  } catch {
    const legacyRows = await prisma.$queryRawUnsafe<Array<{ key: string }>>(
      'SELECT "key" FROM "TransactionCategory" WHERE "key" = $1 LIMIT 1',
      categoryKey
    )
    return legacyRows[0] || DEFAULT_TRANSACTION_CATEGORIES.find((item) => item.key === categoryKey) || null
  }
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = await props.params

  try {
    const transaction = await prisma.transaction.findFirst({
      where: { id: params.id, userId },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...transaction,
      notes: stripInternalNotes(transaction.notes),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transaction' }, { status: 500 })
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = await props.params

  try {
    const body: TransactionData = await request.json()
    const transactionAmount = Number(body.amount)

    const existingTransaction = await prisma.transaction.findFirst({
      where: { id: params.id, userId },
      include: {
        account: true,
        fromAccount: true,
        toAccount: true,
      },
    })

    if (!existingTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (!body.date || !body.description || !body.type || !body.currency || !Number.isFinite(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 })
    }

    if (body.categoryKey) {
      const category = await findCategoryForUser(userId, body.categoryKey)
      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 })
      }
    }

    const applyBalance = shouldApplyBalanceAdjustment(body.date, body.applyBalanceAdjustment)
    const storedNotes = serializeNotes(body.notes, applyBalance)

    const operations: any[] = []

    if (transactionAffectsBalance(existingTransaction)) {
      if ((existingTransaction.type === 'transfer' || existingTransaction.type === 'exchange') && existingTransaction.fromAccount && existingTransaction.toAccount) {
        const creditedAmount = existingTransaction.type === 'exchange'
          ? Math.abs((existingTransaction as any).exchangeToAmount || 0)
          : Math.abs(existingTransaction.amount)

        operations.push(
          prisma.account.update({
            where: { id: existingTransaction.fromAccount.id },
            data: {
              balance: existingTransaction.fromAccount.type === 'credit_card'
                ? existingTransaction.fromAccount.balance - Math.abs(existingTransaction.amount)
                : existingTransaction.fromAccount.balance + Math.abs(existingTransaction.amount),
            },
          }),
          prisma.account.update({
            where: { id: existingTransaction.toAccount.id },
            data: {
              balance: existingTransaction.toAccount.type === 'credit_card'
                ? existingTransaction.toAccount.balance + creditedAmount
                : existingTransaction.toAccount.balance - creditedAmount,
            },
          }),
        )
      } else if (existingTransaction.account) {
        operations.push(
          prisma.account.update({
            where: { id: existingTransaction.account.id },
            data: {
              balance: existingTransaction.account.type === 'credit_card'
                ? existingTransaction.account.balance + existingTransaction.amount
                : existingTransaction.account.balance - existingTransaction.amount,
            },
          }),
        )
      }
    }

    if (body.type === 'transfer' || body.type === 'exchange') {
      if (!body.fromAccountId || !body.toAccountId || body.fromAccountId === body.toAccountId) {
        return NextResponse.json({ error: body.type === 'exchange' ? 'Invalid exchange accounts' : 'Invalid transfer accounts' }, { status: 400 })
      }

      const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findFirst({ where: { id: body.fromAccountId, userId } }),
        prisma.account.findFirst({ where: { id: body.toAccountId, userId } }),
      ])

      if (!fromAccount || !toAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const exchangeToAmount = Number(body.exchangeToAmount)
      const creditedAmount = body.type === 'exchange' ? exchangeToAmount : transactionAmount
      const exchangeToCurrency = body.exchangeToCurrency || toAccount.currency
      const exchangeRateApplied = body.exchangeRateApplied
        ? Number(body.exchangeRateApplied)
        : body.type === 'exchange' && Number.isFinite(exchangeToAmount) && transactionAmount > 0
          ? exchangeToAmount / transactionAmount
          : null

      if (body.type === 'exchange' && (!Number.isFinite(exchangeToAmount) || exchangeToAmount <= 0)) {
        return NextResponse.json({ error: 'Invalid exchange amount' }, { status: 400 })
      }

      if (applyBalance) {
        operations.push(
          prisma.account.update({
            where: { id: fromAccount.id },
            data: {
              balance: fromAccount.type === 'credit_card'
                ? fromAccount.balance + transactionAmount
                : fromAccount.balance - transactionAmount,
            },
          }),
          prisma.account.update({
            where: { id: toAccount.id },
            data: {
              balance: toAccount.type === 'credit_card'
                ? toAccount.balance - creditedAmount
                : toAccount.balance + creditedAmount,
            },
          }),
        )
      }

      operations.push(
        prisma.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            accountId: null,
            fromAccountId: body.fromAccountId,
            toAccountId: body.toAccountId,
            date: new Date(body.date),
            description: body.description,
            type: body.type,
            amount: transactionAmount,
            currency: body.currency,
            categoryKey: body.categoryKey || 'transfer',
            exchangeToAmount: body.type === 'exchange' ? exchangeToAmount : null,
            exchangeToCurrency: body.type === 'exchange' ? exchangeToCurrency : null,
            exchangeRateApplied: body.type === 'exchange' ? exchangeRateApplied : null,
            notes: storedNotes,
          } as any,
        }),
      )
    } else {
      if (!body.accountId) {
        return NextResponse.json({ error: 'Account is required' }, { status: 400 })
      }

      const account = await prisma.account.findFirst({
        where: { id: body.accountId, userId },
      })

      if (!account) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      if (applyBalance) {
        const signedAmount = body.type === 'expense' ? -transactionAmount : transactionAmount
        operations.push(
          prisma.account.update({
            where: { id: account.id },
            data: {
              balance: account.type === 'credit_card'
                ? account.balance - signedAmount
                : account.balance + signedAmount,
            },
          }),
        )
      }

      operations.push(
        prisma.transaction.update({
          where: { id: existingTransaction.id },
          data: {
            accountId: body.accountId,
            fromAccountId: null,
            toAccountId: null,
            date: new Date(body.date),
            description: body.description,
            type: body.type,
            amount: body.type === 'expense' ? -transactionAmount : transactionAmount,
            currency: body.currency,
            categoryKey: body.categoryKey,
            exchangeToAmount: null,
            exchangeToCurrency: null,
            exchangeRateApplied: null,
            notes: storedNotes,
          } as any,
        }),
      )
    }

    const result = await prisma.$transaction(operations)
    return NextResponse.json(result[result.length - 1])
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update transaction' }, { status: 500 })
  }
}
