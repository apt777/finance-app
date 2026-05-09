import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'
import { processDueRecurringTransactions } from '@/lib/recurring'
import { getTransitCardInferenceSettingKey, parseTransitCardInferenceSetting } from '@/lib/transitCardInference'
import { getCalendarDateString, getDatePartsInTimeZone } from '@/lib/timezone'
import { getUserTimeZone } from '@/lib/user-timezone'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatCategoryName(key: string, fallbackName?: string | null) {
  if (fallbackName && !fallbackName.match(/^(income|expense)-\d+$/)) {
    return fallbackName
  }

  if (/^expense-\d+$/.test(key)) {
    return '기타 지출'
  }

  if (/^income-\d+$/.test(key)) {
    return '기타 수입'
  }

  if (/^transfer-\d+$/.test(key)) {
    return '이체'
  }

  return key
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function normalizeTransactionType(
  rawType: string | null | undefined,
  amount: number,
  categoryType?: string | null
) {
  const normalizedType = rawType?.toLowerCase()

  if (normalizedType === 'income' || normalizedType === 'expense') {
    return normalizedType
  }

  if (normalizedType === 'transfer') {
    return 'transfer'
  }

  if (normalizedType === 'exchange') {
    return 'exchange'
  }

  if (categoryType === 'income' || categoryType === 'expense') {
    return categoryType
  }

  return amount < 0 ? 'expense' : 'income'
}

function addAmountToNestedMonthMap(
  target: Map<string, Map<string, number>>,
  accountId: string,
  month: string,
  amount: number
) {
  const current = target.get(accountId) ?? new Map<string, number>()
  current.set(month, (current.get(month) ?? 0) + amount)
  target.set(accountId, current)
}

function roundAnalysisAmount(value: number) {
  return Math.round(value)
}

function readBaseSnapshotAmount(
  transaction: {
    baseCurrencySnapshot?: string | null
    baseAmountSnapshot?: number | null
  },
  baseCurrency: string
) {
  if (transaction.baseCurrencySnapshot === baseCurrency && typeof transaction.baseAmountSnapshot === 'number') {
    return transaction.baseAmountSnapshot
  }

  return null
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await processDueRecurringTransactions(userId)
    const userTimeZone = await getUserTimeZone(userId)

    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: { date: 'asc' },
    })
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        type: true,
        currency: true,
        balance: true,
      },
    })

    const budgets = await prisma.budget.findMany({
      where: { userId },
    }).catch(() => [])
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId },
    }).catch(() => [])
    const transitSettingKeys = accounts
      .filter((account) => account.type === 'transit_card')
      .map((account) => getTransitCardInferenceSettingKey(account.id))
    const transitSettings = transitSettingKeys.length > 0
      ? await prisma.userSetting.findMany({
          where: {
            userId,
            key: { in: transitSettingKeys },
          },
        }).catch(() => [])
      : []

    const categories = await ensureDefaultCategories(userId).catch(() => [])
    const baseCurrency = 'JPY'
    const convertAmount = (amount: number, fromCurrency: string, toCurrency: string) => {
      if (!fromCurrency || fromCurrency === toCurrency) return amount
      const direct = exchangeRates.find((item) => item.fromCurrency === fromCurrency && item.toCurrency === toCurrency)?.rate
      if (direct) return amount * direct
      const inverse = exchangeRates.find((item) => item.fromCurrency === toCurrency && item.toCurrency === fromCurrency)?.rate
      if (inverse) return amount / inverse
      return amount
    }
    const getTransactionAmountInBaseCurrency = (transaction: {
      amount: number
      currency: string
      baseCurrencySnapshot?: string | null
      baseAmountSnapshot?: number | null
    }) => {
      const snapshot = readBaseSnapshotAmount(transaction, baseCurrency)
      if (typeof snapshot === 'number') {
        return snapshot
      }

      return convertAmount(transaction.amount, transaction.currency, baseCurrency)
    }
    const getExchangeToAmountInBaseCurrency = (transaction: {
      exchangeToAmount?: number | null
      exchangeToCurrency?: string | null
      baseCurrencySnapshot?: string | null
      exchangeToBaseAmountSnapshot?: number | null
    }) => {
      if (
        transaction.baseCurrencySnapshot === baseCurrency &&
        typeof transaction.exchangeToBaseAmountSnapshot === 'number'
      ) {
        return transaction.exchangeToBaseAmountSnapshot
      }

      return convertAmount(
        transaction.exchangeToAmount || 0,
        transaction.exchangeToCurrency || baseCurrency,
        baseCurrency
      )
    }

    const categoryMap = new Map(categories.map((category) => [category.key, category.name]))
    const categoryTypeMap = new Map(categories.map((category) => [category.key, category.type]))
    const transitAccounts = accounts.filter((account) => account.type === 'transit_card')
    const transitSettingMap = new Map(
      transitSettings.map((setting) => [setting.key, parseTransitCardInferenceSetting(setting.value)])
    )
    const transitAccountIds = new Set(transitAccounts.map((account) => account.id))
    const transitFundingMap = new Map<string, number>()
    const transitRecordedExpenseMap = new Map<string, number>()
    const transitFundingByMonthMap = new Map<string, Map<string, number>>()
    const transitRecordedExpenseByMonthMap = new Map<string, Map<string, number>>()
    const monthlyMap = new Map<string, { month: string; income: number; expense: number; net: number }>()
    const categoryTotals = new Map<string, number>()
    const monthlyCategoryTotals = new Map<string, Map<string, number>>()
    const yearlyMap = new Map<number, { year: number; income: number; expense: number; net: number }>()
    const exchangeMonthlyMap = new Map<string, { month: string; fromAmount: number; toAmount: number; count: number }>()

    for (const transaction of transactions) {
      const date = new Date(transaction.date)
      if (Number.isNaN(date.getTime())) {
        continue
      }

      const transactionType = normalizeTransactionType(
        transaction.type,
        transaction.amount,
        transaction.categoryKey ? categoryTypeMap.get(transaction.categoryKey) : null
      )

      if (transactionType === 'transfer') {
        if (transaction.toAccountId && transitAccountIds.has(transaction.toAccountId)) {
          transitFundingMap.set(
            transaction.toAccountId,
            (transitFundingMap.get(transaction.toAccountId) ?? 0) + Math.abs(transaction.amount)
          )
          addAmountToNestedMonthMap(
            transitFundingByMonthMap,
            transaction.toAccountId,
            monthKey(date),
            Math.abs(transaction.amount)
          )
        }
        continue
      }

      const key = monthKey(date)

      if (transactionType === 'exchange') {
        if (transaction.toAccountId && transitAccountIds.has(transaction.toAccountId)) {
          transitFundingMap.set(
            transaction.toAccountId,
            (transitFundingMap.get(transaction.toAccountId) ?? 0) + Math.abs(transaction.exchangeToAmount || 0)
          )
          addAmountToNestedMonthMap(
            transitFundingByMonthMap,
            transaction.toAccountId,
            key,
            Math.abs(transaction.exchangeToAmount || 0)
          )
        }
        const exchangeItem = exchangeMonthlyMap.get(key) ?? { month: key, fromAmount: 0, toAmount: 0, count: 0 }
        exchangeItem.fromAmount += Math.abs(getTransactionAmountInBaseCurrency(transaction))
        exchangeItem.toAmount += Math.abs(getExchangeToAmountInBaseCurrency(transaction))
        exchangeItem.count += 1
        exchangeMonthlyMap.set(key, exchangeItem)
        continue
      }

      const monthly = monthlyMap.get(key) ?? { month: key, income: 0, expense: 0, net: 0 }
      const yearly = yearlyMap.get(date.getFullYear()) ?? { year: date.getFullYear(), income: 0, expense: 0, net: 0 }
      const normalizedAmount = Math.abs(getTransactionAmountInBaseCurrency(transaction))

      if (transaction.accountId && transitAccountIds.has(transaction.accountId)) {
        if (transactionType === 'income') {
          transitFundingMap.set(
            transaction.accountId,
            (transitFundingMap.get(transaction.accountId) ?? 0) + Math.abs(transaction.amount)
          )
          addAmountToNestedMonthMap(
            transitFundingByMonthMap,
            transaction.accountId,
            key,
            Math.abs(transaction.amount)
          )
        } else if (transactionType === 'expense') {
          transitRecordedExpenseMap.set(
            transaction.accountId,
            (transitRecordedExpenseMap.get(transaction.accountId) ?? 0) + Math.abs(transaction.amount)
          )
          addAmountToNestedMonthMap(
            transitRecordedExpenseByMonthMap,
            transaction.accountId,
            key,
            Math.abs(transaction.amount)
          )
        }
      }

      if (transactionType === 'income') {
        monthly.income += normalizedAmount
        yearly.income += normalizedAmount
      } else {
        monthly.expense += normalizedAmount
        yearly.expense += normalizedAmount
        if (transaction.categoryKey) {
          categoryTotals.set(
            transaction.categoryKey,
            (categoryTotals.get(transaction.categoryKey) ?? 0) + normalizedAmount
          )

          const monthlyCategoryMap = monthlyCategoryTotals.get(key) ?? new Map<string, number>()
          monthlyCategoryMap.set(
            transaction.categoryKey,
            (monthlyCategoryMap.get(transaction.categoryKey) ?? 0) + normalizedAmount
          )
          monthlyCategoryTotals.set(key, monthlyCategoryMap)
        }
      }

      monthly.net = monthly.income - monthly.expense
      yearly.net = yearly.income - yearly.expense
      monthlyMap.set(key, monthly)
      yearlyMap.set(date.getFullYear(), yearly)
    }

    const inferredTransitExpenseAccounts = transitAccounts
      .map((account) => {
        const topUpAmount = transitFundingMap.get(account.id) ?? 0
        const recordedExpenseAmount = transitRecordedExpenseMap.get(account.id) ?? 0
        const currentBalance = Math.max(account.balance, 0)
        const inferredExpenseAmount = Math.max(0, topUpAmount - recordedExpenseAmount - currentBalance)

        return {
          accountId: account.id,
          accountName: account.name,
          currency: account.currency,
          enabled: transitSettingMap.get(getTransitCardInferenceSettingKey(account.id))?.enabled ?? false,
          categoryKey: transitSettingMap.get(getTransitCardInferenceSettingKey(account.id))?.categoryKey ?? 'transportation',
          topUpAmount,
          recordedExpenseAmount,
          currentBalance,
          inferredExpenseAmount,
          inferredExpenseBaseAmount: convertAmount(inferredExpenseAmount, account.currency, baseCurrency),
        }
      })
      .filter((account) => account.topUpAmount > 0 || account.recordedExpenseAmount > 0 || account.currentBalance > 0)

    const enabledInferredTransitExpenseAccounts = inferredTransitExpenseAccounts.filter((account) => account.enabled)

    enabledInferredTransitExpenseAccounts.forEach((account) => {
      if (account.inferredExpenseBaseAmount <= 0 || !account.categoryKey) {
        return
      }

      categoryTotals.set(
        account.categoryKey,
        (categoryTotals.get(account.categoryKey) ?? 0) + account.inferredExpenseBaseAmount
      )

      const monthlyFunding = transitFundingByMonthMap.get(account.accountId) ?? new Map<string, number>()
      const monthlyRecorded = transitRecordedExpenseByMonthMap.get(account.accountId) ?? new Map<string, number>()
      const monthCandidates = Array.from(new Set([...monthlyFunding.keys(), ...monthlyRecorded.keys()]))
      const weightedMonths = monthCandidates
        .map((month) => {
          const funding = monthlyFunding.get(month) ?? 0
          const recorded = monthlyRecorded.get(month) ?? 0
          return {
            month,
            weight: Math.max(0, funding - recorded),
          }
        })
        .filter((entry) => entry.weight > 0)

      const fallbackMonth =
        monthCandidates.sort().at(-1) ||
        Array.from(monthlyMap.keys()).sort().at(-1) ||
        monthKey(new Date())
      const totalWeight = weightedMonths.reduce((sum, entry) => sum + entry.weight, 0)
      const distributions = totalWeight > 0
        ? weightedMonths.map((entry, index) => {
            const rawAmount = index === weightedMonths.length - 1
              ? account.inferredExpenseAmount - weightedMonths
                  .slice(0, -1)
                  .reduce((sum, prev) => sum + (account.inferredExpenseAmount * prev.weight) / totalWeight, 0)
              : (account.inferredExpenseAmount * entry.weight) / totalWeight

            return {
              month: entry.month,
              amount: rawAmount,
            }
          })
        : [{ month: fallbackMonth, amount: account.inferredExpenseAmount }]

      distributions.forEach(({ month, amount }) => {
        if (amount <= 0) {
          return
        }

        const amountInBaseCurrency = convertAmount(amount, account.currency, baseCurrency)
        const monthCategories = monthlyCategoryTotals.get(month) ?? new Map<string, number>()
        monthCategories.set(
          account.categoryKey!,
          (monthCategories.get(account.categoryKey!) ?? 0) + amountInBaseCurrency
        )
        monthlyCategoryTotals.set(month, monthCategories)

        const monthly = monthlyMap.get(month) ?? { month, income: 0, expense: 0, net: 0 }
        monthly.expense += amountInBaseCurrency
        monthly.net = monthly.income - monthly.expense
        monthlyMap.set(month, monthly)

        const year = Number(month.split('-')[0])
        if (Number.isFinite(year)) {
          const yearly = yearlyMap.get(year) ?? { year, income: 0, expense: 0, net: 0 }
          yearly.expense += amountInBaseCurrency
          yearly.net = yearly.income - yearly.expense
          yearlyMap.set(year, yearly)
        }
      })
    })

    const inferredTransitExpense = {
      total: enabledInferredTransitExpenseAccounts.reduce((sum, account) => sum + account.inferredExpenseBaseAmount, 0),
      accounts: enabledInferredTransitExpenseAccounts,
    }

    const topCategories = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([key, amount]) => ({
        key,
        name: formatCategoryName(key, categoryMap.get(key)),
        amount,
      }))

    const monthlyCategoryBreakdown = Array.from(monthlyCategoryTotals.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, totals]) => ({
        month,
        categories: Array.from(totals.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([key, amount]) => ({
            key,
            name: formatCategoryName(key, categoryMap.get(key)),
            amount,
          })),
      }))

    const latestMonth = Array.from(monthlyMap.values()).slice(-1)[0]
    const today = new Date()
    const todayParts = getDatePartsInTimeZone(today, userTimeZone)
    const [targetYear, targetMonth] = latestMonth
      ? latestMonth.month.split('-').map(Number)
      : [todayParts.year, todayParts.month]
    const activeBudgets = budgets.filter((budget) => {
      if (budget.period !== 'monthly' || !budget.month) return false
      return budget.year === targetYear && budget.month === targetMonth
    })

    const budgetStatus = activeBudgets.map((budget) => {
      const actual = transactions
        .filter((transaction) => {
          const dateKey = getCalendarDateString(transaction.date)
          const [transactionYear, transactionMonth] = dateKey.slice(0, 7).split('-').map(Number)
          const transactionType = normalizeTransactionType(
            transaction.type,
            transaction.amount,
            transaction.categoryKey ? categoryTypeMap.get(transaction.categoryKey) : null
          )
          return (
            transactionType === 'expense' &&
            transactionYear === budget.year &&
            transactionMonth === budget.month &&
            transaction.categoryKey === budget.categoryKey
          )
        })
        .reduce((sum, transaction) => {
          if (budget.currency === baseCurrency) {
            return sum + Math.abs(getTransactionAmountInBaseCurrency(transaction))
          }

          return sum + Math.abs(convertAmount(transaction.amount, transaction.currency, budget.currency))
        }, 0)

      const isCurrentBudgetMonth = todayParts.year === budget.year && todayParts.month === budget.month
      const daysInBudgetMonth = new Date(budget.year, budget.month || 1, 0).getDate()

      return {
        ...budget,
        actual,
        usagePercentage: budget.amount > 0 ? Math.round((actual / budget.amount) * 100) : 0,
        daysRemaining: isCurrentBudgetMonth
          ? Math.max(0, daysInBudgetMonth - todayParts.day)
          : 0,
      }
    })

    return NextResponse.json({
      monthly: Array.from(monthlyMap.values())
        .slice(-12)
        .map((item) => ({
          ...item,
          income: roundAnalysisAmount(item.income),
          expense: roundAnalysisAmount(item.expense),
          net: roundAnalysisAmount(item.net),
        })),
      yearly: Array.from(yearlyMap.values())
        .sort((a, b) => a.year - b.year)
        .map((item) => ({
          ...item,
          income: roundAnalysisAmount(item.income),
          expense: roundAnalysisAmount(item.expense),
          net: roundAnalysisAmount(item.net),
        })),
      exchangeMonthly: Array.from(exchangeMonthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month)).slice(-12),
      topCategories: topCategories.map((item) => ({
        ...item,
        amount: roundAnalysisAmount(item.amount),
      })),
      monthlyCategoryBreakdown: monthlyCategoryBreakdown.map((item) => ({
        ...item,
        categories: item.categories.map((category) => ({
          ...category,
          amount: roundAnalysisAmount(category.amount),
        })),
      })),
      baseCurrency,
      budgetStatus: budgetStatus.map((budget) => ({
        ...budget,
        actual: roundAnalysisAmount(budget.actual),
      })),
      inferredTransitExpense: {
        total: roundAnalysisAmount(inferredTransitExpense.total),
        accounts: inferredTransitExpense.accounts.map((account) => ({
          ...account,
          topUpAmount: roundAnalysisAmount(account.topUpAmount),
          recordedExpenseAmount: roundAnalysisAmount(account.recordedExpenseAmount),
          currentBalance: roundAnalysisAmount(account.currentBalance),
          inferredExpenseAmount: roundAnalysisAmount(account.inferredExpenseAmount),
          inferredExpenseBaseAmount: roundAnalysisAmount(account.inferredExpenseBaseAmount),
        })),
      },
    })
  } catch (error: any) {
    console.error('Failed to build analysis summary:', error)
    return NextResponse.json(
      {
        monthly: [],
        yearly: [],
        exchangeMonthly: [],
        topCategories: [],
        monthlyCategoryBreakdown: [],
        baseCurrency: 'JPY',
        budgetStatus: [],
        inferredTransitExpense: {
          total: 0,
          accounts: [],
        },
      },
      { status: 200 }
    )
  }
}
