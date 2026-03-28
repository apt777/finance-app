import { NextResponse } from 'next/server'
import { requireRouteSession } from '@/lib/server-auth'
import { getUserEntitlements } from '@/lib/entitlements'

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
