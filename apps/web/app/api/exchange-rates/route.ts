import { NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import prisma from '@lib/prisma'

interface ExchangeRateData {
  from: string;
  to: string;
  rate: number;
}

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
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
