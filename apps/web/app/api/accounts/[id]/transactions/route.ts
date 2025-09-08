import { NextResponse } from 'next/server'
import prisma from '../../../../../../lib/prisma' // Adjust path as needed

interface TransactionData {
  date: string;
  description: string;
  amount: number;
  currency: string;
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const accountId = params.id
    const transactions = await prisma.transaction.findMany({
      where: { accountId },
    })
    return NextResponse.json(transactions)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const accountId = params.id
    const { date, description, amount, currency }: TransactionData = await request.json()
    const newTransaction = await prisma.transaction.create({
      data: {
        accountId,
        date: new Date(date), // Ensure date is a Date object
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
