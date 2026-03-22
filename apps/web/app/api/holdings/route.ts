import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { fetchQuote, getHoldingQuoteUpdateIntervalMs } from '@/lib/alphaVantage'

interface HoldingData {
  accountId: string;
  symbol: string;
  name?: string;
  shares: number;
  costBasis: number;
  currency: string;
  investmentType?: string;
  region?: string;
}

async function refreshHoldingPrices(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    select: {
      id: true,
      symbol: true,
      marketPrice: true,
      updatedAt: true,
    },
  })

  const uniqueSymbols = [...new Set(holdings.map((holding) => holding.symbol.trim().toUpperCase()).filter(Boolean))]

  if (uniqueSymbols.length === 0 || !process.env.ALPHA_VANTAGE_API_KEY) {
    return
  }

  const intervalMs = getHoldingQuoteUpdateIntervalMs(uniqueSymbols.length)
  const now = Date.now()
  const staleSymbols = uniqueSymbols.filter((symbol) => {
    const symbolRows = holdings.filter((holding) => holding.symbol.trim().toUpperCase() === symbol)
    const latestUpdatedAt = symbolRows.reduce<number>((latest, row) => Math.max(latest, new Date(row.updatedAt).getTime()), 0)

    if (symbolRows.some((row) => row.marketPrice == null)) {
      return true
    }

    return now - latestUpdatedAt >= intervalMs
  })

  for (const symbol of staleSymbols) {
    try {
      const quote = await fetchQuote(symbol)

      if (!quote) {
        continue
      }

      await prisma.holding.updateMany({
        where: {
          userId,
          symbol,
        },
        data: {
          marketPrice: quote.price,
        },
      })
    } catch (error) {
      console.error(`Failed to refresh holding quote for ${symbol}:`, error)
    }
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await refreshHoldingPrices(userId)

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

    const { accountId, symbol, name, shares, costBasis, currency, investmentType, region }: HoldingData = await request.json()

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
        symbol: symbol.trim().toUpperCase(),
        name: name?.trim() || null,
        shares, 
        costBasis, 
        currency,
        investmentType: investmentType || 'stock',
        region: region?.trim() || null,
      },
    })
    return NextResponse.json(newHolding, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create holding' }, { status: 500 })
  }
}
