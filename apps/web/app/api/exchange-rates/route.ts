import { NextResponse } from 'next/server'
import prisma from '../../../../../lib/prisma' // Adjust path as needed

interface ExchangeRateData {
  from: string;
  to: string;
  rate: number;
}

export async function GET(request: Request) {
  try {
    const exchangeRates = await prisma.exchangeRate.findMany()
    return NextResponse.json(exchangeRates)
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to fetch exchange rates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { from, to, rate }: ExchangeRateData = await request.json()
    const newExchangeRate = await prisma.exchangeRate.create({
      data: { from, to, rate },
    })
    return NextResponse.json(newExchangeRate, { status: 201 })
  } catch (error: any) { // Cast error to any for now
    return NextResponse.json({ error: error.message || 'Failed to create exchange rate' }, { status: 500 })
  }
}