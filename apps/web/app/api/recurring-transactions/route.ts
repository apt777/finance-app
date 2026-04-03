import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { calculateInitialRunDate } from '@/lib/recurring'

function isMissingRecurringTable(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false
  }

  const code = 'code' in error ? String(error.code) : ''
  const message = 'message' in error ? String(error.message) : ''

  return code === 'P2021' || message.includes('RecurringTransaction') || message.includes('does not exist')
}

async function verifyOwnership(userId: string, accountIds: Array<string | undefined>) {
  const filteredIds = accountIds.filter(Boolean) as string[]

  if (filteredIds.length === 0) {
    return true
  }

  const count = await prisma.account.count({
    where: {
      userId,
      id: { in: filteredIds },
    },
  })

  return count === filteredIds.length
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const items = await prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: [{ isActive: 'desc' }, { nextRunDate: 'asc' }],
      include: {
        account: { select: { id: true, name: true } },
        fromAccount: { select: { id: true, name: true } },
        toAccount: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(items)
  } catch (error: any) {
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const {
      name,
      description,
      type,
      amount,
      currency,
      categoryKey,
      accountId,
      fromAccountId,
      toAccountId,
      interval,
      dayOfMonth,
      dayOfWeek,
      startDate,
      endDate,
      isActive,
    } = payload

    if (!name || !description || !type || !currency || Number(amount) <= 0 || !startDate) {
      return NextResponse.json({ error: 'Invalid recurring transaction payload' }, { status: 400 })
    }

    const ownsAccounts = await verifyOwnership(userId, [accountId, fromAccountId, toAccountId])
    if (!ownsAccounts) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const normalizedStartDate = new Date(startDate)
    const recurringTransaction = await prisma.recurringTransaction.create({
      data: {
        userId,
        name,
        description,
        type,
        amount: Number(amount),
        currency,
        categoryKey,
        accountId: accountId || null,
        fromAccountId: fromAccountId || null,
        toAccountId: toAccountId || null,
        interval: interval || 'monthly',
        dayOfMonth: dayOfMonth ? Number(dayOfMonth) : null,
        dayOfWeek: typeof dayOfWeek === 'number' ? dayOfWeek : null,
        startDate: normalizedStartDate,
        endDate: endDate ? new Date(endDate) : null,
        nextRunDate: calculateInitialRunDate(normalizedStartDate, interval || 'monthly', dayOfMonth, dayOfWeek),
        isActive: Boolean(isActive ?? true),
      },
    })

    return NextResponse.json(recurringTransaction, { status: 201 })
  } catch (error: any) {
    if (isMissingRecurringTable(error)) {
      return NextResponse.json(
        {
          error: '반복거래 기능은 아직 현재 데이터베이스에 활성화되지 않았습니다. 운영 DB 마이그레이션 후 사용할 수 있어요.',
          unsupported: true,
        },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: error.message || 'Failed to save recurring transaction' }, { status: 500 })
  }
}
