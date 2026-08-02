import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { getCachedCategoryMap } from '@/lib/categories'
import { ensureDueRecurringTransactionsProcessed } from '@/lib/recurring'
import { stripInternalNotes } from '@/lib/transactionPersistence'

async function getCategoryMapSafely(userId: string) {
  try {
    return await getCachedCategoryMap(userId)
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
