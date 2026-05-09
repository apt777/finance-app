import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'
import { getTransitCardInferenceSettingKey, parseTransitCardInferenceSetting } from '@/lib/transitCardInference'

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await prisma.account.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId: session.user.id,
          key: getTransitCardInferenceSettingKey(account.id),
        },
      },
    }).catch(() => null)

    const inference = parseTransitCardInferenceSetting(setting?.value)

    return NextResponse.json({
      ...account,
      transitInferenceEnabled: inference.enabled,
      transitInferenceCategoryKey: inference.categoryKey,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch account' }, { status: 500 })
  }
}

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })

  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await prisma.account.findFirst({
      where: { id: params.id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    const { name, type, balance, currency, transitInferenceEnabled, transitInferenceCategoryKey } = await request.json()

    const updatedAccount = await prisma.account.update({
      where: { id: params.id },
      data: {
        name,
        type,
        balance: Number(balance),
        currency,
      },
    })

    if (type === 'transit_card') {
      await prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId: session.user.id,
            key: getTransitCardInferenceSettingKey(params.id),
          },
        },
        update: {
          value: JSON.stringify({
            enabled: Boolean(transitInferenceEnabled),
            categoryKey: transitInferenceCategoryKey || 'transportation',
          }),
        },
        create: {
          userId: session.user.id,
          key: getTransitCardInferenceSettingKey(params.id),
          value: JSON.stringify({
            enabled: Boolean(transitInferenceEnabled),
            categoryKey: transitInferenceCategoryKey || 'transportation',
          }),
        },
      })
    } else {
      await prisma.userSetting.deleteMany({
        where: {
          userId: session.user.id,
          key: getTransitCardInferenceSettingKey(params.id),
        },
      })
    }

    return NextResponse.json(updatedAccount)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    // Ensure the account belongs to the logged-in user
    const account = await prisma.account.findFirst({
      where: { id: id, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found or does not belong to user' }, { status: 404 })
    }

    // Delete related transactions and holdings first due to foreign key constraints
    await prisma.transaction.deleteMany({
      where: { accountId: id },
    })
    await prisma.holding.deleteMany({
      where: { accountId: id },
    })

    // Now delete the account
    await prisma.account.delete({
      where: { id: id },
    })

    return NextResponse.json({ message: 'Account deleted successfully' }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete account' }, { status: 500 })
  }
}
