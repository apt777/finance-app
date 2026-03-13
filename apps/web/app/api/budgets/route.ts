import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }, { name: 'asc' }],
    })

    return NextResponse.json(budgets)
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
    const { name, categoryKey, amount, currency, period, year, month, alertThreshold } = await request.json()

    if (!name || !amount || !currency || !period || !year) {
      return NextResponse.json({ error: 'Invalid budget payload' }, { status: 400 })
    }

    const existingBudget = await prisma.budget.findFirst({
      where: {
        userId,
        categoryKey: categoryKey ?? null,
        period,
        year: Number(year),
        month: month ? Number(month) : null,
      },
    })

    const budget = existingBudget
      ? await prisma.budget.update({
          where: { id: existingBudget.id },
          data: {
            name,
            amount: Number(amount),
            currency,
            alertThreshold: Number(alertThreshold) || 80,
          },
        })
      : await prisma.budget.create({
          data: {
            userId,
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

    return NextResponse.json(budget, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save budget' }, { status: 500 })
  }
}
