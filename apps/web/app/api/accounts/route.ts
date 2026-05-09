import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { getTransitCardInferenceSettingKey } from '@/lib/transitCardInference'

// Note: We are omitting userId from this interface as it will be handled by the session
interface AccountData {
  name: string;
  type: string;
  balance: number;
  currency: string;
  transitInferenceEnabled?: boolean;
  transitInferenceCategoryKey?: string | null;
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId,
      },
      orderBy: {
        name: 'asc'
      }
    })
    const transitSettingKeys = accounts.map((account) => getTransitCardInferenceSettingKey(account.id))
    const settings = transitSettingKeys.length > 0
      ? await prisma.userSetting.findMany({
          where: {
            userId,
            key: { in: transitSettingKeys },
          },
        })
      : []
    const settingMap = new Map(settings.map((setting) => [setting.key, setting.value]))

    return NextResponse.json(
      accounts.map((account) => {
        const rawValue = settingMap.get(getTransitCardInferenceSettingKey(account.id))
        let parsed: any = null
        if (rawValue) {
          try {
            parsed = JSON.parse(rawValue)
          } catch {
            parsed = null
          }
        }
        return {
          ...account,
          transitInferenceEnabled: Boolean(parsed?.enabled),
          transitInferenceCategoryKey: typeof parsed?.categoryKey === 'string' ? parsed.categoryKey : null,
        }
      })
    )
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, session } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure a user record exists in the public schema
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: session?.user.email ?? `${userId}@local.invalid`,
      },
    });

    const { name, type, balance, currency, transitInferenceEnabled, transitInferenceCategoryKey }: AccountData = await request.json()

    const [newAccount] = await prisma.$transaction([
      prisma.account.create({
        data: {
          userId,
          name,
          type,
          balance,
          currency,
        },
      }),
    ])

    if (type === 'transit_card') {
      await prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: getTransitCardInferenceSettingKey(newAccount.id),
          },
        },
        update: {
          value: JSON.stringify({
            enabled: Boolean(transitInferenceEnabled),
            categoryKey: transitInferenceCategoryKey || 'transportation',
          }),
        },
        create: {
          userId,
          key: getTransitCardInferenceSettingKey(newAccount.id),
          value: JSON.stringify({
            enabled: Boolean(transitInferenceEnabled),
            categoryKey: transitInferenceCategoryKey || 'transportation',
          }),
        },
      })
    }

    return NextResponse.json(newAccount, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 })
  }
}
