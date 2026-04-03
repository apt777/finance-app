import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { processDueRecurringTransactions } from '@/lib/recurring'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function addAmountByCurrency(target: Record<string, number>, currency: string, amount: number) {
  target[currency] = (target[currency] || 0) + amount
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await processDueRecurringTransactions(userId)

    const today = new Date()
    const monthEnd = endOfMonth(today)
    const currentMonthKey = monthKey(today)

    const [recurringItems, accounts, paymentPlans] = await Promise.all([
      prisma.recurringTransaction.findMany({
        where: {
          userId,
          isActive: true,
          type: 'expense',
          nextRunDate: {
            gte: startOfDay(today),
            lte: monthEnd,
          },
        },
        select: {
          amount: true,
          currency: true,
          nextRunDate: true,
          interval: true,
          dayOfMonth: true,
          dayOfWeek: true,
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
    ])

    const recurringByCurrency: Record<string, number> = {}
    recurringItems.forEach((item) => {
      addAmountByCurrency(recurringByCurrency, item.currency, Math.abs(item.amount))
    })

    const accountCurrencyMap = new Map(accounts.map((account) => [account.id, account.currency]))
    const creditCardPaymentsByCurrency: Record<string, number> = {}

    paymentPlans.forEach((setting) => {
      const accountId = setting.key.replace('credit_card_payment_plan:', '')
      const currency = accountCurrencyMap.get(accountId)
      if (!currency) return

      try {
        const parsed = JSON.parse(setting.value)
        const amount = Number(parsed?.[currentMonthKey] || 0)
        if (Number.isFinite(amount) && amount > 0) {
          addAmountByCurrency(creditCardPaymentsByCurrency, currency, amount)
        }
      } catch {
        // Ignore invalid legacy payment-plan payloads.
      }
    })

    return NextResponse.json({
      recurringByCurrency,
      creditCardPaymentsByCurrency,
      totalUpcomingCount: recurringItems.length,
      totalCreditCardCount: Object.values(creditCardPaymentsByCurrency).filter((amount) => amount > 0).length,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        recurringByCurrency: {},
        creditCardPaymentsByCurrency: {},
        totalUpcomingCount: 0,
        totalCreditCardCount: 0,
      },
      { status: 200 }
    )
  }
}
