import { NextRequest, NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'
import { normalizeAppLocale } from '@/lib/defaultCategories'
import { getLocaleBaseCurrency, getLocaleMirrorCurrency, getLocaleTrackedCurrencies } from '@/lib/currencyPreferences'

interface AccountInput {
  name: string
  type: string
  currency: string
  balance: number | string
}

interface ExchangeRateInput {
  fromCurrency: string
  toCurrency: string
  rate: number | string
}

interface BudgetInput {
  name: string
  categoryKey?: string
  amount: number | string
  currency: string
  period: string
  year: number
  month?: number
  alertThreshold?: number
}

interface RecurringInput {
  name: string
  description: string
  type: string
  amount: number | string
  currency: string
  categoryKey?: string
  accountName?: string
  fromAccountName?: string
  toAccountName?: string
  interval: string
  dayOfMonth?: number
  dayOfWeek?: number
  startDate: string
}

function getNextRunDate(startDate: Date, interval: string, dayOfMonth?: number, dayOfWeek?: number) {
  const next = new Date(startDate)

  if (interval === 'weekly') {
    const diff = ((dayOfWeek ?? startDate.getDay()) - next.getDay() + 7) % 7 || 7
    next.setDate(next.getDate() + diff)
    return next
  }

  next.setMonth(next.getMonth() + 1)
  if (dayOfMonth) {
    next.setDate(Math.min(dayOfMonth, 28))
  }

  return next
}

export async function POST(request: NextRequest) {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const {
      accounts,
      exchangeRates,
      budgets,
      recurringTransactions,
      locale,
      trackedCurrencies,
      baseCurrency,
      mirrorCurrency,
    } = await request.json() as {
      accounts: AccountInput[]
      exchangeRates: ExchangeRateInput[]
      budgets?: BudgetInput[]
      recurringTransactions?: RecurringInput[]
      locale?: string
      trackedCurrencies?: string[]
      baseCurrency?: string
      mirrorCurrency?: string
    }

    if (!Array.isArray(accounts) || !Array.isArray(exchangeRates)) {
      return NextResponse.json({ error: 'Invalid setup payload' }, { status: 400 })
    }

    const normalizedLocale = normalizeAppLocale(locale)
    const resolvedTrackedCurrencies = Array.isArray(trackedCurrencies) && trackedCurrencies.length >= 2
      ? trackedCurrencies
      : getLocaleTrackedCurrencies(normalizedLocale)
    const resolvedBaseCurrency = typeof baseCurrency === 'string'
      ? baseCurrency
      : getLocaleBaseCurrency(normalizedLocale)
    const resolvedMirrorCurrency = typeof mirrorCurrency === 'string'
      ? mirrorCurrency
      : getLocaleMirrorCurrency(normalizedLocale)

    await ensureDefaultCategories(userId, normalizedLocale)

    const accountIdMap = new Map<string, string>()

    await prisma.$transaction(async (tx) => {
      for (const account of accounts) {
        const created = await tx.account.create({
          data: {
            userId,
            name: account.name,
            type: account.type,
            currency: account.currency,
            balance: Number(account.balance) || 0,
          },
        })

        accountIdMap.set(account.name.trim(), created.id)
      }

      for (const rate of exchangeRates) {
        if (!rate.rate || Number(rate.rate) <= 0) {
          continue
        }

        await tx.exchangeRate.upsert({
          where: {
            userId_fromCurrency_toCurrency: {
              userId,
              fromCurrency: rate.fromCurrency,
              toCurrency: rate.toCurrency,
            },
          },
          update: {
            rate: Number(rate.rate),
            source: 'manual',
          },
          create: {
            userId,
            fromCurrency: rate.fromCurrency,
            toCurrency: rate.toCurrency,
            rate: Number(rate.rate),
            source: 'manual',
          },
        })
      }

      for (const budget of budgets ?? []) {
        if (!budget.name || Number(budget.amount) <= 0) {
          continue
        }

        await tx.budget.create({
          data: {
            userId,
            name: budget.name,
            categoryKey: budget.categoryKey || null,
            amount: Number(budget.amount),
            currency: budget.currency,
            period: budget.period || 'monthly',
            year: Number(budget.year),
            month: budget.month ? Number(budget.month) : null,
            alertThreshold: Number(budget.alertThreshold) || 80,
          },
        })
      }

      for (const item of recurringTransactions ?? []) {
        if (!item.name || !item.description || Number(item.amount) <= 0) {
          continue
        }

        const startDate = new Date(item.startDate)

        await tx.recurringTransaction.create({
          data: {
            userId,
            name: item.name,
            description: item.description,
            type: item.type,
            amount: Number(item.amount),
            currency: item.currency,
            categoryKey: item.categoryKey || null,
            accountId: item.accountName ? accountIdMap.get(item.accountName.trim()) ?? null : null,
            fromAccountId: item.fromAccountName ? accountIdMap.get(item.fromAccountName.trim()) ?? null : null,
            toAccountId: item.toAccountName ? accountIdMap.get(item.toAccountName.trim()) ?? null : null,
            interval: item.interval || 'monthly',
            dayOfMonth: item.dayOfMonth ? Number(item.dayOfMonth) : null,
            dayOfWeek: typeof item.dayOfWeek === 'number' ? item.dayOfWeek : null,
            startDate,
            nextRunDate: getNextRunDate(startDate, item.interval || 'monthly', item.dayOfMonth, item.dayOfWeek),
            isActive: true,
          },
        })
      }

      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: 'onboarding_completed',
          },
        },
        update: {
          value: 'true',
        },
        create: {
          userId,
          key: 'onboarding_completed',
          value: 'true',
        },
      })

      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: 'tracked_currencies',
          },
        },
        update: {
          value: JSON.stringify(resolvedTrackedCurrencies),
        },
        create: {
          userId,
          key: 'tracked_currencies',
          value: JSON.stringify(resolvedTrackedCurrencies),
        },
      })

      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: 'dashboard_base_currency',
          },
        },
        update: {
          value: resolvedBaseCurrency,
        },
        create: {
          userId,
          key: 'dashboard_base_currency',
          value: resolvedBaseCurrency,
        },
      })

      await tx.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: 'dashboard_mirror_currency',
          },
        },
        update: {
          value: resolvedMirrorCurrency,
        },
        create: {
          userId,
          key: 'dashboard_mirror_currency',
          value: resolvedMirrorCurrency,
        },
      })
    })

    return NextResponse.json({ message: '초기 설정이 완료되었습니다.' }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || '초기화 실패' }, { status: 500 })
  }
}
