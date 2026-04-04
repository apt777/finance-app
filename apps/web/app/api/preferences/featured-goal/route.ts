import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

const FEATURED_GOAL_KEY = 'dashboard_featured_goal'

export async function GET() {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: FEATURED_GOAL_KEY,
        },
      },
    })

    return NextResponse.json({ goalId: setting?.value || null })
  } catch (error: any) {
    return NextResponse.json({ goalId: null, error: error.message || 'Failed to load featured goal' }, { status: 200 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const goalId = typeof payload?.goalId === 'string' && payload.goalId.trim() ? payload.goalId.trim() : null

    if (goalId) {
      const goal = await prisma.goal.findFirst({
        where: {
          id: goalId,
          userId,
        },
        select: { id: true },
      })

      if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
      }
    }

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: FEATURED_GOAL_KEY,
        },
      },
      update: {
        value: goalId || '',
      },
      create: {
        userId,
        key: FEATURED_GOAL_KEY,
        value: goalId || '',
      },
    })

    return NextResponse.json({ goalId })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save featured goal' }, { status: 500 })
  }
}
