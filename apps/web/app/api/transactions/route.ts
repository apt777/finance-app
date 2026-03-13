import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'
import { DEFAULT_TRANSACTION_CATEGORIES } from '@/lib/defaultCategories'

interface TransactionData {
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
  date: string
  description: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  categoryKey?: string
  notes?: string
}

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    const category = await prisma.transactionCategory.findFirst({
      where: { key: categoryKey },
    })
    if (category) {
      return category
    }
    return DEFAULT_TRANSACTION_CATEGORIES.find((item) => item.key === categoryKey) ?? null
  }
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const [transactions, categories] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        include: {
          account: { select: { id: true, name: true, currency: true } },
          fromAccount: { select: { id: true, name: true, currency: true } },
          toAccount: { select: { id: true, name: true, currency: true } },
        },
      }),
      ensureDefaultCategories(userId),
    ])

    const categoryMap = new Map(
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

    return NextResponse.json(
      transactions.map((transaction) => ({
        ...transaction,
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
    const { date, description, type, amount: rawAmount, currency, categoryKey, notes } = body
    const transactionAmount = Number(rawAmount)

    if (!date || !description || !type || !currency || Number.isNaN(transactionAmount) || transactionAmount <= 0) {
      return NextResponse.json({ error: 'Invalid transaction payload' }, { status: 400 })
    }

    if (categoryKey) {
      const category = await findCategoryForUser(userId, categoryKey)

      if (!category) {
        return NextResponse.json({ error: 'Category not found' }, { status: 400 })
      }
    }

    if (type === 'transfer') {
      const { fromAccountId, toAccountId } = body

      if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        return NextResponse.json({ error: 'Invalid transfer accounts' }, { status: 400 })
      }

      const [fromAccount, toAccount] = await Promise.all([
        prisma.account.findFirst({ where: { id: fromAccountId, userId } }),
        prisma.account.findFirst({ where: { id: toAccountId, userId } }),
      ])

      if (!fromAccount || !toAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      }

      const newFromBalance = fromAccount.type === 'credit_card'
        ? fromAccount.balance + transactionAmount
        : fromAccount.balance - transactionAmount
      const newToBalance = toAccount.type === 'credit_card'
        ? toAccount.balance - transactionAmount
        : toAccount.balance + transactionAmount

      const [, , newTransaction] = await prisma.$transaction([
        prisma.account.update({ where: { id: fromAccountId }, data: { balance: newFromBalance } }),
        prisma.account.update({ where: { id: toAccountId }, data: { balance: newToBalance } }),
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
            notes,
          },
        }),
      ])

      return NextResponse.json(newTransaction, { status: 201 })
    }

    const { accountId } = body

    if (!accountId) {
      return NextResponse.json({ error: 'Account is required' }, { status: 400 })
    }

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const newBalance = account.type === 'credit_card'
      ? type === 'income'
        ? account.balance - transactionAmount
        : account.balance + transactionAmount
      : type === 'income'
        ? account.balance + transactionAmount
        : account.balance - transactionAmount

    const [, newTransaction] = await prisma.$transaction([
      prisma.account.update({ where: { id: accountId }, data: { balance: newBalance } }),
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
          notes,
        },
      }),
    ])

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
        if (transaction.type === 'transfer' && transaction.fromAccount && transaction.toAccount) {
          const restoredFromBalance = transaction.fromAccount.type === 'credit_card'
            ? transaction.fromAccount.balance - transaction.amount
            : transaction.fromAccount.balance + transaction.amount
          const restoredToBalance = transaction.toAccount.type === 'credit_card'
            ? transaction.toAccount.balance + transaction.amount
            : transaction.toAccount.balance - transaction.amount

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
