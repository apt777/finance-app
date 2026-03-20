import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

interface HoldingData {
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
  investmentType?: string;
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userAccounts = await prisma.account.findMany({
      where: { userId },
      select: { id: true }
    })

    const accountIds = userAccounts.map(a => a.id)

    const holdings = await prisma.holding.findMany({
      where: {
        accountId: {
          in: accountIds
        }
      },
      include: {
        account: {
          select: { name: true }
        }
      }
    })
    return NextResponse.json(holdings)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch holdings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { accountId, symbol, shares, costBasis, currency, investmentType }: HoldingData = await request.json()

    // Verify the account belongs to the user
    const account = await prisma.account.findFirst({
      where: {
        id: accountId,
        userId
      }
    })

    if (!account) {
      return NextResponse.json({ error: 'Account not found or you do not have permission' }, { status: 404 })
    }

    const newHolding = await prisma.holding.create({
      data: { 
        userId,
        accountId, 
        symbol, 
        shares, 
        costBasis, 
        currency,
        investmentType: investmentType || 'stock'
      },
    })
    return NextResponse.json(newHolding, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create holding' }, { status: 500 })
  }
}
