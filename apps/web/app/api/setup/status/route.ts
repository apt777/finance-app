import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'onboarding_completed',
        },
      },
    })

    return NextResponse.json({
      completed: setting?.value === 'true',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch setup status' }, { status: 500 })
  }
}
