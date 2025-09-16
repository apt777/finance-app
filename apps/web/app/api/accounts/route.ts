import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

// Note: We are omitting userId from this interface as it will be handled by the session
interface AccountData {
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
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
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure a user record exists in the public schema
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: {
        id: session.user.id,
        email: session.user.email!, // email is guaranteed to exist for a logged in user
      },
    });

    const { name, type, balance, currency }: AccountData = await request.json()

    const newAccount = await prisma.account.create({
      data: {
        userId: session.user.id, // Use the ID from the session
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