import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { processDueRecurringTransactions } from '@/lib/recurring'
import { getCalendarDateString, getMonthKeyInTimeZone, getTodayDateStringInTimeZone } from '@/lib/timezone'
import { getUserTimeZone } from '@/lib/user-timezone'

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

    const userTimeZone = await getUserTimeZone(userId)
    const currentMonthKey = getMonthKeyInTimeZone(userTimeZone)
    const todayDateString = getTodayDateStringInTimeZone(userTimeZone)

    const [recurringItems, accounts, paymentPlans] = await Promise.all([
      prisma.recurringTransaction.findMany({
        where: {
          userId,
          isActive: true,
          type: 'expense',
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
    const upcomingRecurringItems = recurringItems
      .filter((item) => {
        if (!item.nextRunDate) return false

        const runDate = getCalendarDateString(item.nextRunDate)
        return runDate >= todayDateString && runDate.slice(0, 7) === currentMonthKey
      })
    upcomingRecurringItems.forEach((item) => {
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
      totalUpcomingCount: upcomingRecurringItems.length,
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
