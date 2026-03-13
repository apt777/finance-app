import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

interface GoalData {
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
  targetCurrency?: string
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: [{ priority: 'desc' }, { targetDate: 'asc' }],
    })

    return NextResponse.json(goals)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch goals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { name, targetAmount, currentAmount, targetDate, targetCurrency }: GoalData = await request.json()

    const newGoal = await prisma.goal.create({
      data: {
        userId,
        name,
        targetAmount: Number(targetAmount),
        currentAmount: Number(currentAmount),
        targetDate: targetDate ? new Date(targetDate) : null,
        targetCurrency: targetCurrency || 'JPY',
      },
    })

    return NextResponse.json(newGoal, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create goal' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const goalId = searchParams.get('id')

    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 })
    }

    const deleted = await prisma.goal.deleteMany({
      where: {
        id: goalId,
        userId,
      },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    return NextResponse.json({ message: 'Goal deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete goal' }, { status: 500 })
  }
}
