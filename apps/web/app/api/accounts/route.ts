import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

// Note: We are omitting userId from this interface as it will be handled by the session
interface AccountData {
  name: string;
  type: string;
  balance: number;
  currency: string;
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
    return NextResponse.json(accounts)
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

    const { name, type, balance, currency }: AccountData = await request.json()

    const newAccount = await prisma.account.create({
      data: {
        userId,
        name,
        type,
        balance,
        currency,
      },
    })
    return NextResponse.json(newAccount, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 })
  }
}
