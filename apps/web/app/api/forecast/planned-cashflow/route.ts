import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { calculateNextRunDate, processDueRecurringTransactions } from '@/lib/recurring'

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function buildForecastMonths(count: number) {
  const base = startOfMonth(new Date())
  return Array.from({ length: count }).map((_, index) => {
    const current = new Date(base.getFullYear(), base.getMonth() + index, 1)
    return {
      key: monthKey(current),
      start: startOfMonth(current),
      end: endOfMonth(current),
    }
  })
}

function parseExpectedIncomeSetting(value: string | null | undefined) {
  if (!value) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed as Record<string, Record<string, number>> : {}
  } catch {
    return {}
  }
}

function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: Array<{ fromCurrency: string; toCurrency: string; rate: number }>
) {
  if (fromCurrency === toCurrency) return amount

  const direct = rates.find((item) => item.fromCurrency === fromCurrency && item.toCurrency === toCurrency)?.rate
  if (direct) return amount * direct

  const reverse = rates.find((item) => item.fromCurrency === toCurrency && item.toCurrency === fromCurrency)?.rate
  if (reverse && reverse !== 0) return amount / reverse

  return amount
}

export async function GET(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await processDueRecurringTransactions(userId)

    const { searchParams } = new URL(request.url)
    const baseCurrency = searchParams.get('baseCurrency') || 'JPY'
    const months = buildForecastMonths(6)
    const horizonEnd = months[months.length - 1]?.end ?? endOfMonth(new Date())

    const [recurringItems, creditCardPlanSettings, exchangeRates, accounts, creditCardAccounts, expectedIncomeSetting] = await Promise.all([
      prisma.recurringTransaction.findMany({
        where: {
          userId,
          isActive: true,
          startDate: { lte: horizonEnd },
          OR: [{ endDate: null }, { endDate: { gte: months[0]?.start ?? startOfMonth(new Date()) } }],
        },
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          interval: true,
          dayOfMonth: true,
          dayOfWeek: true,
          nextRunDate: true,
          endDate: true,
        },
      }),
      prisma.userSetting.findMany({
        where: {
          userId,
          key: {
            startsWith: 'credit_card_payment_plan:',
          },
        },
        select: {
          key: true,
          value: true,
        },
      }),
      prisma.exchangeRate.findMany({
        where: { userId },
        select: {
          fromCurrency: true,
          toCurrency: true,
          rate: true,
        },
      }),
      prisma.account.findMany({
        where: {
          userId,
          type: { not: 'credit_card' },
        },
        select: {
          balance: true,
          currency: true,
        },
      }),
      prisma.account.findMany({
        where: {
          userId,
          type: 'credit_card',
        },
        select: {
          id: true,
          currency: true,
        },
      }),
      prisma.userSetting.findUnique({
        where: {
          userId_key: {
            userId,
            key: 'planned_cashflow_expected_income',
          },
        },
        select: { value: true },
      }),
    ])

    const expectedIncomeByCurrency = parseExpectedIncomeSetting(expectedIncomeSetting?.value)
    const creditCardCurrencyMap = new Map(creditCardAccounts.map((account) => [account.id, account.currency]))

    const openingBalance = Math.round(
      accounts.reduce((sum, account) => sum + convertAmount(account.balance, account.currency, baseCurrency, exchangeRates), 0)
    )

    let rollingBalance = openingBalance

    const forecast = months.map((month) => {
      let recurringExpense = 0
      let recurringIncome = 0
      let cardPayments = 0

      recurringItems.forEach((item) => {
        if (item.type === 'transfer') return

        let runDate = item.nextRunDate ? new Date(item.nextRunDate) : startOfMonth(month.start)

        while (runDate && runDate <= month.end) {
          if (item.endDate && runDate > item.endDate) {
            break
          }

          if (runDate >= month.start && runDate <= month.end) {
            const convertedAmount = convertAmount(Math.abs(item.amount), item.currency, baseCurrency, exchangeRates)
            if (item.type === 'income') {
              recurringIncome += convertedAmount
            } else if (item.type === 'expense') {
              recurringExpense += convertedAmount
            }
          }

          const nextRun = calculateNextRunDate(runDate, item.interval, item.dayOfMonth, item.dayOfWeek)
          if (!nextRun || nextRun.getTime() === runDate.getTime()) {
            break
          }
          runDate = nextRun
        }
      })

      creditCardPlanSettings.forEach((setting) => {
        try {
          const parsed = JSON.parse(setting.value)
          const amount = Number(parsed?.[month.key] || 0)
          if (Number.isFinite(amount) && amount > 0) {
            const accountId = setting.key.replace('credit_card_payment_plan:', '')
            const paymentCurrency = creditCardCurrencyMap.get(accountId) || baseCurrency
            cardPayments += convertAmount(amount, paymentCurrency, baseCurrency, exchangeRates)
          }
        } catch {
          // ignore malformed legacy plan values
        }
      })

      const expectedIncome = Object.entries(expectedIncomeByCurrency).reduce((sum, [currency, byMonth]) => {
        const amount = Number(byMonth?.[month.key] || 0)
        if (!Number.isFinite(amount) || amount <= 0) return sum
        return sum + convertAmount(amount, currency, baseCurrency, exchangeRates)
      }, 0)

      const totalIncoming = expectedIncome + recurringIncome
      const totalOutgoing = recurringExpense + cardPayments
      const net = totalIncoming - totalOutgoing
      rollingBalance += net

      return {
        month: month.key,
        expectedIncome: Math.round(expectedIncome),
        recurringIncome: Math.round(recurringIncome),
        recurringExpense: Math.round(recurringExpense),
        cardPayments: Math.round(cardPayments),
        totalIncoming: Math.round(totalIncoming),
        totalOutgoing: Math.round(totalOutgoing),
        net: Math.round(net),
        projectedBalance: Math.round(rollingBalance),
      }
    })

    return NextResponse.json({
      baseCurrency,
      openingBalance,
      expectedIncomeByCurrency,
      months: forecast,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to build planned cashflow forecast' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const payload = await request.json()
    const baseCurrency = typeof payload?.baseCurrency === 'string' ? payload.baseCurrency : 'JPY'
    const months = payload?.months && typeof payload.months === 'object' ? payload.months : {}

    const existing = await prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key: 'planned_cashflow_expected_income',
        },
      },
      select: { value: true },
    })

    const current = parseExpectedIncomeSetting(existing?.value)
    current[baseCurrency] = Object.entries(months).reduce<Record<string, number>>((acc, [month, amount]) => {
      const normalizedAmount = Number(amount)
      if (Number.isFinite(normalizedAmount) && normalizedAmount >= 0) {
        acc[month] = normalizedAmount
      }
      return acc
    }, {})

    await prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: 'planned_cashflow_expected_income',
        },
      },
      update: {
        value: JSON.stringify(current),
      },
      create: {
        userId,
        key: 'planned_cashflow_expected_income',
        value: JSON.stringify(current),
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to save expected income forecast' }, { status: 500 })
  }
}
