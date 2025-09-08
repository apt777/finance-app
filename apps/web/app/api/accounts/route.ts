import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma' // Adjust path as needed

interface AccountData {
  userId: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export async function GET(request: Request) {
  try {
    // In a real app, you'd filter by user ID
    const accounts = await prisma.account.findMany()
    return NextResponse.json(accounts)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, name, type, balance, currency }: AccountData = await request.json()
    const newAccount = await prisma.account.create({
      data: { userId, name, type, balance, currency },
    })
    return NextResponse.json(newAccount, { status: 201 })
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to create account' }, { status: 500 })
  }
}
