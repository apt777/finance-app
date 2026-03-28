import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

const QUICK_ACTIONS_KEY = 'quick_actions'

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
          key: QUICK_ACTIONS_KEY,
        },
      },
    })

    const quickActions = setting?.value ? JSON.parse(setting.value) : []
    return NextResponse.json({ quickActions: Array.isArray(quickActions) ? quickActions : [] })
  } catch (error: any) {
    return NextResponse.json({ quickActions: [], error: error.message || 'Failed to load quick actions' }, { status: 200 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const quickActions = Array.isArray(payload?.quickActions) ? payload.quickActions.slice(0, 6) : []

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: QUICK_ACTIONS_KEY,
        },
      },
      update: {
        value: JSON.stringify(quickActions),
      },
      create: {
        userId,
        key: QUICK_ACTIONS_KEY,
        value: JSON.stringify(quickActions),
      },
    })

    return NextResponse.json({ quickActions })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save quick actions' }, { status: 500 })
  }
}
