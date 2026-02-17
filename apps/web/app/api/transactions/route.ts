import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

interface TransactionData {
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  date: string;
  description: string;
  type: string;
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

    // Fetch all transactions for the logged-in user, including transfers
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        account: { select: { name: true, currency: true } },
        fromAccount: { select: { name: true, currency: true } },
        toAccount: { select: { name: true, currency: true } },
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

    const body: TransactionData = await request.json()
    const { date, description, type, amount: rawAmount, currency } = body
    const transactionAmount = Number(rawAmount)

    if (type === 'transfer') {
      const { fromAccountId, toAccountId } = body
      if (!fromAccountId || !toAccountId) {
        return NextResponse.json({ error: 'Source and destination accounts are required' }, { status: 400 })
      }

      const fromAccount = await prisma.account.findUnique({ where: { id: fromAccountId } })
      const toAccount = await prisma.account.findUnique({ where: { id: toAccountId } })

      if (!fromAccount || !toAccount) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      if (fromAccount.userId !== session.user.id || toAccount.userId !== session.user.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }

      // Calculate new balances
      // Regular: Asset. Credit Card: Liability (Positive balance = Debt)
      
      let newFromBalance = fromAccount.balance
      if (fromAccount.type === 'credit_card') {
        // Transfer FROM Credit Card = Cash Advance (Debt increases)
        newFromBalance += transactionAmount
      } else {
        // Transfer FROM Regular = Withdrawal (Asset decreases)
        newFromBalance -= transactionAmount
      }

      let newToBalance = toAccount.balance
      if (toAccount.type === 'credit_card') {
        // Transfer TO Credit Card = Payment (Debt decreases)
        newToBalance -= transactionAmount
      } else {
        // Transfer TO Regular = Deposit (Asset increases)
        newToBalance += transactionAmount
      }

      const [_, __, newTransaction] = await prisma.$transaction([
        prisma.account.update({ where: { id: fromAccountId }, data: { balance: newFromBalance } }),
        prisma.account.update({ where: { id: toAccountId }, data: { balance: newToBalance } }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            fromAccountId,
            toAccountId,
            date: new Date(date),
            description,
            type,
            amount: transactionAmount,
            currency,
          },
        }),
      ])

      return NextResponse.json(newTransaction, { status: 201 })

    } else {
      const { accountId } = body
      if (!accountId) return NextResponse.json({ error: 'Account ID is required' }, { status: 400 })

      const account = await prisma.account.findUnique({ where: { id: accountId } })
      if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
      if (account.userId !== session.user.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

      let newBalance
      if (account.type === 'credit_card') {
        if (type === 'income') {
          newBalance = account.balance - transactionAmount
        } else {
          newBalance = account.balance + transactionAmount
        }
      } else {
        if (type === 'income') {
          newBalance = account.balance + transactionAmount
        } else {
          newBalance = account.balance - transactionAmount
        }
      }

      const [_, newTransaction] = await prisma.$transaction([
        prisma.account.update({ where: { id: accountId }, data: { balance: newBalance } }),
        prisma.transaction.create({
          data: {
            userId: session.user.id,
            accountId,
            date: new Date(date),
            description,
            type,
            amount: type === 'expense' ? -transactionAmount : transactionAmount,
            currency,
          },
        }),
      ])

      return NextResponse.json(newTransaction, { status: 201 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { ids } = await request.json()
    if (!ids || !Array.isArray(ids)) return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 })

    const transactionsToDelete = await prisma.transaction.findMany({
      where: {
        id: { in: ids },
        userId: session.user.id
      },
      include: { account: true }
    })

    await prisma.$transaction(async (tx) => {
      for (const t of transactionsToDelete) {
        if (t.account) {
            let newBalance = t.account.balance;
            // Credit Card: Balance represents debt. 
            // If we delete an expense (negative amount), debt should decrease. (Current Balance + (-1000) = Balance - 1000)
            // If we delete an income (positive amount), debt should increase. (Current Balance + 1000)
            if (t.account.type === 'credit_card') {
                newBalance += t.amount;
            } else {
                // Regular Account: Balance represents asset.
                // If we delete an expense (negative amount), asset should increase. (Current Balance - (-1000) = Balance + 1000)
                // If we delete an income (positive amount), asset should decrease. (Current Balance - 1000)
                newBalance -= t.amount;
            }
            
            await tx.account.update({
                where: { id: t.accountId! },
                data: { balance: newBalance }
            })
        }
      }
      
      await tx.transaction.deleteMany({
        where: { id: { in: ids } }
      })
    })

    return NextResponse.json({ message: 'Deleted successfully' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
