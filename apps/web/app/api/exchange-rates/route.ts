import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

interface ExchangeRateData {
  from: string;
  to: string;
  rate: number;
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const API_RATE_TARGETS = [
  { base: 'JPY', quote: 'KRW' },
  { base: 'USD', quote: 'JPY' },
  { base: 'USD', quote: 'KRW' },
  { base: 'CNY', quote: 'JPY' },
  { base: 'EUR', quote: 'JPY' },
  { base: 'GBP', quote: 'JPY' },
] as const

function isApiManagedPair(fromCurrency: string, toCurrency: string) {
  return API_RATE_TARGETS.some((pair) => pair.base === fromCurrency && pair.quote === toCurrency)
}

async function updateRatesFromExternalApi(userId: string) {
  try {
    const uniqueBases = [...new Set(API_RATE_TARGETS.map((pair) => pair.base))]
    const responses = await Promise.all(
      uniqueBases.map(async (base) => {
        const response = await fetch(`https://open.er-api.com/v6/latest/${base}`)
        const data = await response.json()
        return { base, data }
      })
    )

    const rateTables = new Map<string, Record<string, number>>()

    for (const { base, data } of responses) {
      if (data.result !== 'success' || !data.rates) {
        console.error('Failed to fetch external rates:', { base, data })
        continue
      }

      rateTables.set(base, data.rates as Record<string, number>)
    }

    const operations = API_RATE_TARGETS.flatMap(({ base, quote }) => {
      const table = rateTables.get(base)
      const rate = table?.[quote]

      if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
        return []
      }

      return [
        prisma.exchangeRate.upsert({
          where: {
            userId_fromCurrency_toCurrency: {
              userId,
              fromCurrency: base,
              toCurrency: quote,
            },
          },
          update: {
            rate,
            source: 'api',
            updatedAt: new Date(),
          },
          create: {
            userId,
            fromCurrency: base,
            toCurrency: quote,
            rate,
            source: 'api',
          },
        }),
      ]
    })

    if (operations.length > 0) {
      await prisma.$transaction(operations)
      console.log(`Updated exchange rates for user ${userId}`)
    }

  } catch (error) {
    console.error('Error updating rates from external API:', error);
  }
}

export async function GET(request: Request) {
  try {
    const { userId } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const managedRates = await prisma.exchangeRate.findMany({
      where: {
        userId,
        OR: API_RATE_TARGETS.map((pair) => ({
          fromCurrency: pair.base,
          toCurrency: pair.quote,
        })),
      },
      orderBy: {
        updatedAt: 'desc',
      },
    })

    const oldestManagedRate = managedRates.at(-1)
    const shouldUpdate =
      managedRates.length < API_RATE_TARGETS.length ||
      !oldestManagedRate ||
      (new Date().getTime() - new Date(oldestManagedRate.updatedAt).getTime() > UPDATE_INTERVAL_MS)

    if (shouldUpdate) {
      await updateRatesFromExternalApi(userId)
    }

    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        userId,
        OR: API_RATE_TARGETS.map((pair) => ({
          fromCurrency: pair.base,
          toCurrency: pair.quote,
        })),
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    return NextResponse.json(exchangeRates)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch exchange rates' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { userId, session } = await requireRouteSession()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure a user record exists in the public schema
    await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: {
        id: userId,
        email: session?.user.email ?? `${userId}@local.invalid`,
      },
    });

    const { from, to, rate }: ExchangeRateData = await request.json()

    if (!isApiManagedPair(from, to)) {
      return NextResponse.json({ error: 'Only the supported exchange-rate pairs can be updated.' }, { status: 400 })
    }

    // Check if this exchange rate pair already exists for the user
    const existingRate = await prisma.exchangeRate.findUnique({
      where: {
        userId_fromCurrency_toCurrency: {
          userId,
          fromCurrency: from,
          toCurrency: to,
        }
      }
    })

    if (existingRate) {
      // Update existing rate
      const updatedRate = await prisma.exchangeRate.update({
        where: { id: existingRate.id },
        data: { rate },
      })
      return NextResponse.json(updatedRate, { status: 200 })
    }

    // Create new exchange rate
    const newExchangeRate = await prisma.exchangeRate.create({
      data: {
        userId,
        fromCurrency: from,
        toCurrency: to,
        rate,
      },
    })
    return NextResponse.json(newExchangeRate, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to create exchange rate' }, { status: 500 })
  }
}
