import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

const SETTING_KEY = 'tracked_currencies'
const DEFAULT_CURRENCIES = ['JPY', 'USD', 'KRW']
const ALLOWED_CURRENCIES = new Set(['JPY', 'KRW', 'USD', 'CNY', 'EUR', 'GBP'])

function normalizeCurrencies(input: unknown) {
  if (!Array.isArray(input)) {
    return DEFAULT_CURRENCIES
  }

  const currencies = input
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.toUpperCase())
    .filter((value) => ALLOWED_CURRENCIES.has(value))

  return Array.from(new Set(currencies)).slice(0, 6)
}

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
          key: SETTING_KEY,
        },
      },
    })

    const trackedCurrencies = setting?.value ? normalizeCurrencies(JSON.parse(setting.value)) : DEFAULT_CURRENCIES
    return NextResponse.json({ trackedCurrencies })
  } catch {
    return NextResponse.json({ trackedCurrencies: DEFAULT_CURRENCIES })
  }
}

export async function PUT(request: Request) {
  const { userId, session } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const trackedCurrencies = normalizeCurrencies(payload?.trackedCurrencies)

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
          key: SETTING_KEY,
        },
      },
      update: {
        value: JSON.stringify(trackedCurrencies),
      },
      create: {
        userId,
        key: SETTING_KEY,
        value: JSON.stringify(trackedCurrencies),
      },
    })

    return NextResponse.json({ trackedCurrencies })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update tracked currencies' }, { status: 500 })
  }
}
