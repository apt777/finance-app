import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { getMonthKeyInTimeZone } from '@/lib/timezone'
import { getUserTimeZone } from '@/lib/user-timezone'

function getPlanKey(accountId: string) {
  return `credit_card_payment_plan:${accountId}`
}

function getPaymentSettingsKey(accountId: string) {
  return `credit_card_payment_settings:${accountId}`
}

type CreditCardPaymentSettings = {
  paymentLoggingMode?: 'planned_only' | 'separate_transfer'
  paymentSourceAccountId?: string
  paymentDayOfMonth?: number | null
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params

  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [setting, settingsRecord] = await Promise.all([
      prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: getPlanKey(params.id),
          },
        },
      }),
      prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: getPaymentSettingsKey(params.id),
          },
        },
      }),
    ])

    const paymentPlan = setting?.value ? JSON.parse(setting.value) : {}
    const paymentSettings = settingsRecord?.value ? JSON.parse(settingsRecord.value) : {}
    return NextResponse.json({ paymentPlan, paymentSettings })
  } catch (error: any) {
    return NextResponse.json({ paymentPlan: {}, paymentSettings: {}, error: error.message || 'Failed to load payment plan' }, { status: 200 })
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params

  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await request.json()
    const paymentPlan = payload?.paymentPlan && typeof payload.paymentPlan === 'object' ? payload.paymentPlan : {}
    const rawSettings = payload?.paymentSettings && typeof payload.paymentSettings === 'object' ? payload.paymentSettings : {}
    const paymentSettings: CreditCardPaymentSettings = {
      paymentLoggingMode: rawSettings.paymentLoggingMode === 'separate_transfer' ? 'separate_transfer' : 'planned_only',
      paymentSourceAccountId: typeof rawSettings.paymentSourceAccountId === 'string' ? rawSettings.paymentSourceAccountId : '',
      paymentDayOfMonth: Number.isFinite(Number(rawSettings.paymentDayOfMonth))
        ? Math.min(31, Math.max(1, Number(rawSettings.paymentDayOfMonth)))
        : null,
    }
    const userTimeZone = await getUserTimeZone(userId)
    const currentMonthKey = getMonthKeyInTimeZone(userTimeZone)
    const currentMonthPlannedAmount = Number(paymentPlan?.[currentMonthKey] || 0)

    await prisma.$transaction(async (tx) => {
      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: getPlanKey(params.id),
          },
        },
        update: {
          value: JSON.stringify(paymentPlan),
        },
        create: {
          userId,
          key: getPlanKey(params.id),
          value: JSON.stringify(paymentPlan),
        },
      })

      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: getPaymentSettingsKey(params.id),
          },
        },
        update: {
          value: JSON.stringify(paymentSettings),
        },
        create: {
          userId,
          key: getPaymentSettingsKey(params.id),
          value: JSON.stringify(paymentSettings),
        },
      })

      if (Number.isFinite(currentMonthPlannedAmount) && currentMonthPlannedAmount >= 0) {
        await tx.account.updateMany({
          where: {
            id: params.id,
            userId,
            type: 'credit_card',
          },
          data: {
            balance: currentMonthPlannedAmount,
          },
        })
      }
    })

    return NextResponse.json({ paymentPlan, paymentSettings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save payment plan' }, { status: 500 })
  }
}
