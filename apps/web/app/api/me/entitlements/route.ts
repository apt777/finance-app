import { NextResponse } from 'next/server'
import { requireRouteSession } from '@/lib/server-auth'
import { getUserEntitlements, isSubscriptionPlan } from '@/lib/entitlements'
import prisma from '@lib/prisma'

export async function GET() {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entitlements = await getUserEntitlements(userId)
    return NextResponse.json(entitlements)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch entitlements' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const plan = payload?.plan

    if (!isSubscriptionPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: 'subscription_plan',
        },
      },
      update: {
        value: plan,
      },
      create: {
        userId,
        key: 'subscription_plan',
        value: plan,
      },
    })

    return NextResponse.json(await getUserEntitlements(userId))
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update entitlements' }, { status: 500 })
  }
}
