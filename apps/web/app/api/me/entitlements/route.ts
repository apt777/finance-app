import { NextResponse } from 'next/server'
import { requireRouteSession } from '@/lib/server-auth'
import { getUserEntitlements, isSubscriptionPlan } from '@/lib/entitlements'

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

    const payload = await request.json().catch(() => null)
    const plan = payload?.plan

    if (plan && !isSubscriptionPlan(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: 'Subscription changes are managed by billing only.',
      },
      { status: 403 }
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update entitlements' }, { status: 500 })
  }
}
