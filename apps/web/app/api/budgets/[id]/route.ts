import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { name, categoryKey, amount, currency, period, year, month, alertThreshold } = body

    const budget = await prisma.budget.findFirst({
      where: { id, userId },
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    const updated = await prisma.budget.update({
      where: { id },
      data: {
        name,
        categoryKey: categoryKey ?? null,
        amount: Number(amount),
        currency,
        period,
        year: Number(year),
        month: month ? Number(month) : null,
        alertThreshold: Number(alertThreshold) || 80,
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update budget' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return unauthorized()
  }

  try {
    const { id } = await params
    const budget = await prisma.budget.findFirst({
      where: { id, userId },
      select: { id: true },
    })

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 })
    }

    await prisma.budget.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete budget' }, { status: 500 })
  }
}
