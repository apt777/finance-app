import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { calculateInitialRunDate } from '@/lib/recurring'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function verifyOwnership(userId: string, accountIds: Array<string | undefined | null>) {
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const { id } = await params
    const payload = await request.json()
    const item = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
    })

    if (!item) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    const ownsAccounts = await verifyOwnership(userId, [payload.accountId, payload.fromAccountId, payload.toAccountId])
    if (!ownsAccounts) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const isReactivating = !item.isActive && Boolean(payload.isActive)
    const startDate = isReactivating
      ? new Date()
      : payload.startDate
        ? new Date(payload.startDate)
        : item.startDate
    const interval = payload.interval || item.interval || 'monthly'
    const dayOfMonth = payload.dayOfMonth ? Number(payload.dayOfMonth) : null
    const dayOfWeek = typeof payload.dayOfWeek === 'number' ? payload.dayOfWeek : null
    const nextRunDate = payload.isActive === false
      ? item.nextRunDate
      : calculateInitialRunDate(startDate, interval, dayOfMonth, dayOfWeek)

    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        type: payload.type,
        amount: Number(payload.amount),
        currency: payload.currency,
        categoryKey: payload.categoryKey ?? null,
        accountId: payload.accountId || null,
        fromAccountId: payload.fromAccountId || null,
        toAccountId: payload.toAccountId || null,
        interval,
        dayOfMonth,
        dayOfWeek,
        startDate,
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        isActive: Boolean(payload.isActive),
        nextRunDate: nextRunDate || null,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update recurring transaction' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const { id } = await params
    const item = await prisma.recurringTransaction.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!item) {
      return NextResponse.json({ error: 'Recurring transaction not found' }, { status: 404 })
    }

    await prisma.recurringTransaction.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete recurring transaction' }, { status: 500 })
  }
}
