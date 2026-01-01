import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { accounts, exchangeRates } = await request.json()
    const cookieStore = await cookies()
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

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.id

    // Create accounts
    for (const account of accounts) {
      await prisma.account.create({
        data: {
          userId,
          name: account.name,
          type: account.type,
          currency: account.currency,
          balance: parseFloat(account.balance) || 0,
        },
      })
    }

    // Create exchange rates
    for (const rate of exchangeRates) {
      await prisma.exchangeRate.upsert({
        where: {
          userId_fromCurrency_toCurrency: {
            userId,
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
          },
        },
        update: {
          rate: parseFloat(rate.rate) || 0,
        },
        create: {
          userId,
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
          rate: parseFloat(rate.rate) || 0,
          source: 'manual',
        },
      })
    }

    return NextResponse.json(
      { message: '초기 설정이 완료되었습니다.' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Setup error:', error)
    return NextResponse.json(
      { error: error.message || '초기화 실패' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
