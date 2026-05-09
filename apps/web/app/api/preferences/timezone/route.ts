import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { TIMEZONE_SETTING_KEY, normalizeTimeZone, isValidTimeZone } from '@/lib/timezone'

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
          key: TIMEZONE_SETTING_KEY,
        },
      },
    })

    return NextResponse.json({
      timeZone: isValidTimeZone(setting?.value) ? setting?.value : null,
    })
  } catch {
    return NextResponse.json({ timeZone: null })
  }
}

export async function PUT(request: Request) {
  const { userId, session } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const timeZone = normalizeTimeZone(payload?.timeZone)

    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: session?.user.email ?? `${userId}@local.invalid`,
      },
    })

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: TIMEZONE_SETTING_KEY,
        },
      },
      update: {
        value: timeZone,
      },
      create: {
        userId,
        key: TIMEZONE_SETTING_KEY,
        value: timeZone,
      },
    })

    return NextResponse.json({ timeZone })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update time zone' }, { status: 500 })
  }
}
