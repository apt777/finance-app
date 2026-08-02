import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'
import { ensureDueRecurringTransactionsProcessed } from '@/lib/recurring'

function stripInternalNotes(notes?: string | null) {
  if (!notes) return null

  const cleaned = notes
    .replace('[[KABLUS_NO_BALANCE_SYNC]]', '')
    .replace('[[KABLUS_RECURRING_AUTO]]', '')
    .trim()
  return cleaned || null
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
      ]),
    )
  } catch (error) {
    console.error('Failed to resolve overview categories:', error)
    return new Map()
  }
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await ensureDueRecurringTransactionsProcessed(userId)

    const [accounts, transactions, holdings, goals, categoryMap] = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { name: 'asc' },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.holding.findMany({
        where: { userId },
      }),
      prisma.goal.findMany({
        where: { userId },
      }),
      getCategoryMapSafely(userId),
    ])

    return NextResponse.json({
      accounts,
      transactions: transactions.map((transaction) => ({
        ...transaction,
        notes: stripInternalNotes(transaction.notes),
        category: transaction.categoryKey ? categoryMap.get(transaction.categoryKey) ?? null : null,
      })),
      holdings,
      goals,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch overview data' }, { status: 500 })
  }
}
