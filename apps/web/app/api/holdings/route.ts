import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { fetchQuote, getHoldingQuoteUpdateIntervalMs } from '@/lib/alphaVantage'

interface HoldingData {
  action?: 'create' | 'buy' | 'sell';
  holdingId?: string;
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

    const { action = 'create', holdingId, accountId, symbol, name, shares, costBasis, currency, investmentType, region }: HoldingData = await request.json()

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

    if (action === 'buy' || action === 'sell') {
      if (!holdingId) {
        return NextResponse.json({ error: 'Holding is required' }, { status: 400 })
      }

      const existingHolding = await prisma.holding.findFirst({
        where: {
          id: holdingId,
          userId,
          accountId,
        },
      })

      if (!existingHolding) {
        return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
      }

      if (action === 'sell') {
        if (shares > existingHolding.shares) {
          return NextResponse.json({ error: '매도 수량이 현재 보유 수량보다 많습니다.' }, { status: 400 })
        }

        if (shares === existingHolding.shares) {
          await prisma.holding.delete({
            where: { id: existingHolding.id },
          })

          return NextResponse.json({ deleted: true, id: existingHolding.id }, { status: 200 })
        }

        const soldHolding = await prisma.holding.update({
          where: { id: existingHolding.id },
          data: {
            shares: existingHolding.shares - shares,
          },
        })

        return NextResponse.json(soldHolding, { status: 200 })
      }

      const totalExistingCost = existingHolding.shares * existingHolding.costBasis
      const totalBuyCost = shares * costBasis
      const nextShares = existingHolding.shares + shares
      const nextCostBasis = nextShares > 0 ? (totalExistingCost + totalBuyCost) / nextShares : existingHolding.costBasis

      const boughtHolding = await prisma.holding.update({
        where: { id: existingHolding.id },
        data: {
          shares: nextShares,
          costBasis: nextCostBasis,
          marketPrice: existingHolding.marketPrice,
        },
      })

      return NextResponse.json(boughtHolding, { status: 200 })
    }

    const normalizedSymbol = symbol.trim().toUpperCase()
    const duplicateHolding = await prisma.holding.findFirst({
      where: {
        userId,
        accountId,
        symbol: normalizedSymbol,
      },
    })

    if (duplicateHolding) {
      return NextResponse.json({ error: '이미 같은 계좌에 등록된 투자입니다. 추가 매수를 사용해 주세요.' }, { status: 409 })
    }

    const newHolding = await prisma.holding.create({
      data: {
        userId,
        accountId,
        symbol: normalizedSymbol,
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

export async function DELETE(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'Holding id is required' }, { status: 400 })
    }

    const existingHolding = await prisma.holding.findFirst({
      where: {
        id,
        userId,
      },
      select: {
        id: true,
      },
    })

    if (!existingHolding) {
      return NextResponse.json({ error: 'Holding not found' }, { status: 404 })
    }

    await prisma.holding.delete({
      where: {
        id: existingHolding.id,
      },
    })

    return NextResponse.json({ success: true, id: existingHolding.id }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete holding' }, { status: 500 })
  }
}
