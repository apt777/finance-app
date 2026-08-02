import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'
import { ensureDueRecurringTransactionsProcessed } from '@/lib/recurring'

function stripInternalNotes(notes?: string | null) {
  if (!notes) return null

  const cleaned = notes.replace('[[KABLUS_NO_BALANCE_SYNC]]', '').trim()
  return cleaned || null
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
    console.error('Failed to resolve account transaction categories:', error)
    return new Map()
  }
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureDueRecurringTransactionsProcessed(userId)
    const request = _request
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const pageSizeParam = searchParams.get('pageSize')
    const showAll = pageSizeParam === 'all'
    const pageSize = showAll ? null : Math.max(1, Number(pageSizeParam) || 30)
    const skip = showAll || !pageSize ? 0 : (page - 1) * pageSize
    const take = showAll || !pageSize ? undefined : pageSize

    const { id } = await props.params

    const account = await prisma.account.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found or does not belong to user' }, { status: 404 })
    }

    const where = {
      userId,
      OR: [{ accountId: id }, { fromAccountId: id }, { toAccountId: id }],
    }

    const [transactions, total, categoryMap, summaryTransactions] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip,
        take,
        include: {
          account: {
            select: { id: true, name: true, currency: true },
          },
          fromAccount: {
            select: { id: true, name: true, currency: true },
          },
          toAccount: {
            select: { id: true, name: true, currency: true },
          },
        },
      }),
      prisma.transaction.count({ where }),
      getCategoryMapSafely(userId),
      prisma.transaction.findMany({
        where,
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
