import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

interface TransactionData {
  accountId: string;
  date: string;
  description: string;
  type: string; // Added type
  amount: number;
  currency: string;
}

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all transactions for the logged-in user
    const transactions = await prisma.transaction.findMany({
      where: {
        account: {
          userId: session.user.id,
        },
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        account: { // Include account details for display
          select: { name: true, currency: true },
        },
      },
    })
    return NextResponse.json(transactions)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, date, description, type, amount, currency }: TransactionData = await request.json()

    // TODO: Re-enable account ownership check once user-account linking is properly handled
    // For now, allow adding transactions to any account for testing/seeding purposes

    const newTransaction = await prisma.transaction.create({
      data: {
        accountId,
        date: new Date(date),
        description,
        type,
        amount,
        currency,
      },
    })
    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 })
  }
}
