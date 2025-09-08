import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma' // Adjust path as needed

interface TransactionData {
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
}

export async function GET(request: Request) {
  try {
    // In a real app, you'd filter by user ID
    const transactions = await prisma.transaction.findMany()
    return NextResponse.json(transactions)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { accountId, date, description, amount, currency }: TransactionData = await request.json()
    const newTransaction = await prisma.transaction.create({
      data: {
        accountId,
        date: new Date(date),
        description,
        amount,
        currency,
      },
    })
    return NextResponse.json(newTransaction, { status: 201 })
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 })
  }
}