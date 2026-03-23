import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'

interface ExchangeRateData {
  from: string;
  to: string;
  rate: number;
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_TRACKED_CURRENCIES = ['JPY', 'USD', 'KRW']

async function getTrackedCurrencies(userId: string) {
  try {
    const setting = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'tracked_currencies',
        },
      },
    })

    if (!setting?.value) {
      return DEFAULT_TRACKED_CURRENCIES
    }

    const parsed = JSON.parse(setting.value)
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TRACKED_CURRENCIES
  } catch {
    return DEFAULT_TRACKED_CURRENCIES
  }
}

async function updateRatesFromExternalApi(userId: string) {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/JPY');
    const data = await response.json();

    if (data.result !== 'success') {
      console.error('Failed to fetch external rates:', data);
      return;
    }

    const rates = data.rates;
    const trackedCurrencies = await getTrackedCurrencies(userId)
    const targets = trackedCurrencies.filter((currency) => currency !== 'JPY')

    // Prepare operations for transaction
    const operations = [];

    for (const target of targets) {
      if (rates[target]) {
        const rate = rates[target];
        
        // JPY -> Target
        operations.push(
          prisma.exchangeRate.upsert({
            where: {
              userId_fromCurrency_toCurrency: {
                userId,
                fromCurrency: 'JPY',
                toCurrency: target,
              }
            },
            update: {
              rate: rate,
              source: 'api',
              updatedAt: new Date(),
            },
            create: {
              userId,
              fromCurrency: 'JPY',
              toCurrency: target,
              rate: rate,
              source: 'api',
            }
          })
        );

      }
    }

    await prisma.$transaction(operations);
    console.log(`Updated exchange rates for user ${userId}`);

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

    // Check the most recently updated rate
    const latestRate = await prisma.exchangeRate.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' }
    });

    const shouldUpdate = !latestRate || (new Date().getTime() - new Date(latestRate.updatedAt).getTime() > UPDATE_INTERVAL_MS);

    if (shouldUpdate) {
      await updateRatesFromExternalApi(userId);
    }

    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        userId,
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
