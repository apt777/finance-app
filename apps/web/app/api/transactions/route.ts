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
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
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
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, date, description, type, amount, currency }: TransactionData = await request.json()

    // 1. Find the account to ensure it exists and get its current balance
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    
    if (account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // 2. Calculate the new balance based on account type
    let newBalance;
    const transactionAmount = Number(amount);

    if (account.type === 'credit_card') {
      // For credit cards, 'expense' increases balance (liability), 'income' (payment) decreases it
      if (type === 'income') {
        newBalance = account.balance - transactionAmount;
      } else {
        newBalance = account.balance + transactionAmount;
      }
    } else {
      // For regular accounts, 'income' increases balance, 'expense' decreases it
      if (type === 'income') {
        newBalance = account.balance + transactionAmount;
      } else {
        newBalance = account.balance - transactionAmount;
      }
    }

    // 3. Use a Prisma transaction to update the account and create the transaction
    const [updatedAccount, newTransaction] = await prisma.$transaction([
      prisma.account.update({
        where: { id: accountId },
        data: { balance: newBalance },
      }),
      prisma.transaction.create({
        data: {
          userId: session.user.id,
          accountId,
          date: new Date(date),
          description,
          type,
          amount: transactionAmount,
          currency,
        },
      }),
    ]);

    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 })
  }
}
