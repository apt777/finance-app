import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

const DIAGNOSTIC_USER_ID = '9d2a6dd8-60a1-478a-af54-605d05cc2256'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  if (userId !== DIAGNOSTIC_USER_ID) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const { id } = await props.params

    const account = await prisma.account.findFirst({
      where: { id, userId },
      select: {
        id: true,
        name: true,
        currency: true,
        type: true,
        balance: true,
      },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const [directCount, fromCount, toCount, duplicateNamedAccounts, linkedTransactions] = await Promise.all([
      prisma.transaction.count({ where: { userId, accountId: id } }),
      prisma.transaction.count({ where: { userId, fromAccountId: id } }),
      prisma.transaction.count({ where: { userId, toAccountId: id } }),
      prisma.account.findMany({
        where: {
          userId,
          name: account.name,
          NOT: { id },
        },
        select: {
          id: true,
          name: true,
          currency: true,
          type: true,
          balance: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          OR: [{ accountId: id }, { fromAccountId: id }, { toAccountId: id }],
        },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          date: true,
          description: true,
          type: true,
          amount: true,
          currency: true,
          accountId: true,
          fromAccountId: true,
          toAccountId: true,
        },
        take: 20,
      }),
    ])

    const monthlyMap = new Map<string, { month: string; direct: number; from: number; to: number; total: number }>()

    linkedTransactions.forEach((transaction) => {
      const month = new Date(transaction.date).toISOString().slice(0, 7)
      const entry = monthlyMap.get(month) || { month, direct: 0, from: 0, to: 0, total: 0 }

      if (transaction.accountId === id) entry.direct += 1
      if (transaction.fromAccountId === id) entry.from += 1
      if (transaction.toAccountId === id) entry.to += 1
      entry.total += 1

      monthlyMap.set(month, entry)
    })

    return NextResponse.json({
      account,
      counts: {
        direct: directCount,
        from: fromCount,
        to: toCount,
        total: directCount + fromCount + toCount,
      },
      duplicateNamedAccounts,
      monthlySummary: Array.from(monthlyMap.values()).sort((a, b) => b.month.localeCompare(a.month)),
      linkedTransactions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to inspect account transactions' }, { status: 500 })
  }
}
