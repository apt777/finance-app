import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

interface ExchangeRateData {
  from: string;
  to: string;
  rate: number;
}

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function updateRatesFromExternalApi(userId: string) {
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/JPY');
    const data = await response.json();

    if (data.result !== 'success') {
      console.error('Failed to fetch external rates:', data);
      return;
    }

    const rates = data.rates;
    const targets = ['KRW', 'USD', 'CNY', 'EUR', 'GBP']; // Major currencies to track

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

        // Target -> JPY (Inverse)
        if (rate !== 0) {
          operations.push(
            prisma.exchangeRate.upsert({
              where: {
                userId_fromCurrency_toCurrency: {
                  userId,
                  fromCurrency: target,
                  toCurrency: 'JPY',
                }
              },
              update: {
                rate: 1 / rate,
                source: 'api',
                updatedAt: new Date(),
              },
              create: {
                userId,
                fromCurrency: target,
                toCurrency: 'JPY',
                rate: 1 / rate,
                source: 'api',
              }
            })
          );
        }
      }
    }

    // Also handle KRW -> USD (Derived from JPY->KRW and JPY->USD)
    // KRW -> USD = (JPY -> USD) / (JPY -> KRW)
    if (rates['KRW'] && rates['USD']) {
        const krwToUsd = rates['USD'] / rates['KRW'];
        operations.push(
            prisma.exchangeRate.upsert({
                where: {
                    userId_fromCurrency_toCurrency: {
                        userId,
                        fromCurrency: 'KRW',
                        toCurrency: 'USD',
                    }
                },
                update: { rate: krwToUsd, source: 'api', updatedAt: new Date() },
                create: { userId, fromCurrency: 'KRW', toCurrency: 'USD', rate: krwToUsd, source: 'api' }
            })
        );
         operations.push(
            prisma.exchangeRate.upsert({
                where: {
                    userId_fromCurrency_toCurrency: {
                        userId,
                        fromCurrency: 'USD',
                        toCurrency: 'KRW',
                    }
                },
                update: { rate: 1 / krwToUsd, source: 'api', updatedAt: new Date() },
                create: { userId, fromCurrency: 'USD', toCurrency: 'KRW', rate: 1 / krwToUsd, source: 'api' }
            })
        );
    }

    await prisma.$transaction(operations);
    console.log(`Updated exchange rates for user ${userId}`);

  } catch (error) {
    console.error('Error updating rates from external API:', error);
  }
}

export async function GET(request: Request) {
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check the most recently updated rate
    const latestRate = await prisma.exchangeRate.findFirst({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' }
    });

    const shouldUpdate = !latestRate || (new Date().getTime() - new Date(latestRate.updatedAt).getTime() > UPDATE_INTERVAL_MS);

    if (shouldUpdate) {
      await updateRatesFromExternalApi(session.user.id);
    }

    const exchangeRates = await prisma.exchangeRate.findMany({
      where: {
        userId: session.user.id,
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
  const cookieStore = await cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore as any })
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure a user record exists in the public schema
    await prisma.user.upsert({
      where: { id: session.user.id },
      update: {},
      create: {
        id: session.user.id,
        email: session.user.email!,
      },
    });

    const { from, to, rate }: ExchangeRateData = await request.json()

    // Check if this exchange rate pair already exists for the user
    const existingRate = await prisma.exchangeRate.findUnique({
      where: {
        userId_fromCurrency_toCurrency: {
          userId: session.user.id,
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
        userId: session.user.id,
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
