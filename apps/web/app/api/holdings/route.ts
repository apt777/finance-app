import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma' // Adjust path as needed

interface HoldingData {
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
}

export async function GET(request: Request) {
  try {
    // In a real app, you'd filter by user ID
    const holdings = await prisma.holding.findMany()
    return NextResponse.json(holdings)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch holdings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { accountId, symbol, shares, costBasis, currency }: HoldingData = await request.json()
    const newHolding = await prisma.holding.create({
      data: { accountId, symbol, shares, costBasis, currency },
    })
    return NextResponse.json(newHolding, { status: 201 })
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to create holding' }, { status: 500 })
  }
}
