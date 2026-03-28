import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

function getPlanKey(accountId: string) {
  return `credit_card_payment_plan:${accountId}`
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params

  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: getPlanKey(params.id),
        },
      },
    })

    const paymentPlan = setting?.value ? JSON.parse(setting.value) : {}
    return NextResponse.json({ paymentPlan })
  } catch (error: any) {
    return NextResponse.json({ paymentPlan: {}, error: error.message || 'Failed to load payment plan' }, { status: 200 })
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

    await prisma.userSetting.upsert({
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

    return NextResponse.json({ paymentPlan })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save payment plan' }, { status: 500 })
  }
}
