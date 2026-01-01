
import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@lib/prisma';

interface TransactionData {
  description: string;
  amount: number;
  date: string;
  type: 'income' | 'expense';
}

interface AccountData {
  name: string;
  type: string;
  balance: number;
  currency: string;
  transactions: TransactionData[];
}

interface SetupData {
  accounts: AccountData[];
}

export async function POST(request: Request) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  );
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }


    // Ensure a user record exists in the public schema before proceeding
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: {
        id: session.user.id,
        email: session.user.email!, // email is guaranteed to exist for a logged in user
      },
    });

    const userId = session.user.id;
    const { accounts }: SetupData = await request.json();

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      for (const account of accounts) {
        const createdAccount = await tx.account.create({
          data: {
            userId,
            name: account.name,
            type: account.type,
            balance: account.balance,
            currency: account.currency,
          },
        });

        if (account.transactions && account.transactions.length > 0) {
          for (const transaction of account.transactions) {
            await tx.transaction.create({
              data: {
                accountId: createdAccount.id,
                date: new Date(transaction.date),
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                currency: account.currency,
              },
            });
          }
        }
      }
    });

    return NextResponse.json({ message: 'Setup completed successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Setup failed:', error);
    return NextResponse.json({ error: error.message || 'Failed to complete setup' }, { status: 500 });
  }
}
