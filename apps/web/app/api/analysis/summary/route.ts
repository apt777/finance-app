import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'

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

  if (categoryType === 'income' || categoryType === 'expense') {
    return categoryType
  }

  return amount < 0 ? 'expense' : 'income'
}

export async function GET() {
  const { userId } = await requireRouteSession()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: { date: 'asc' },
    })

    const budgets = await prisma.budget.findMany({
      where: { userId },
    }).catch(() => [])
    const exchangeRates = await prisma.exchangeRate.findMany({
      where: { userId },
    }).catch(() => [])

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

    const categoryMap = new Map(categories.map((category) => [category.key, category.name]))
    const categoryTypeMap = new Map(categories.map((category) => [category.key, category.type]))
    const monthlyMap = new Map<string, { month: string; income: number; expense: number; net: number }>()
    const categoryTotals = new Map<string, number>()
    const monthlyCategoryTotals = new Map<string, Map<string, number>>()
    const yearlyMap = new Map<number, { year: number; income: number; expense: number; net: number }>()

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
        continue
      }

      const key = monthKey(date)
      const monthly = monthlyMap.get(key) ?? { month: key, income: 0, expense: 0, net: 0 }
      const yearly = yearlyMap.get(date.getFullYear()) ?? { year: date.getFullYear(), income: 0, expense: 0, net: 0 }
      const normalizedAmount = Math.abs(convertAmount(transaction.amount, transaction.currency, baseCurrency))

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
    const activeBudgets = budgets.filter((budget) => {
      if (budget.period !== 'monthly' || !budget.month) return false
      if (!latestMonth) return false
      const [year, month] = latestMonth.month.split('-').map(Number)
      return budget.year === year && budget.month === month
    })

    const budgetStatus = activeBudgets.map((budget) => {
      const actual = transactions
        .filter((transaction) => {
          const date = new Date(transaction.date)
          const transactionType = normalizeTransactionType(
            transaction.type,
            transaction.amount,
            transaction.categoryKey ? categoryTypeMap.get(transaction.categoryKey) : null
          )
          return (
            !Number.isNaN(date.getTime()) &&
            transactionType === 'expense' &&
            date.getFullYear() === budget.year &&
            date.getMonth() + 1 === budget.month &&
            transaction.categoryKey === budget.categoryKey
          )
        })
        .reduce((sum, transaction) => sum + Math.abs(convertAmount(transaction.amount, transaction.currency, budget.currency)), 0)

      return {
        ...budget,
        actual,
        usagePercentage: budget.amount > 0 ? Math.round((actual / budget.amount) * 100) : 0,
      }
    })

    return NextResponse.json({
      monthly: Array.from(monthlyMap.values()).slice(-12),
      yearly: Array.from(yearlyMap.values()).sort((a, b) => a.year - b.year),
      topCategories,
      monthlyCategoryBreakdown,
      baseCurrency,
      budgetStatus,
    })
  } catch (error: any) {
    console.error('Failed to build analysis summary:', error)
    return NextResponse.json(
      {
        monthly: [],
        yearly: [],
        topCategories: [],
        monthlyCategoryBreakdown: [],
        baseCurrency: 'JPY',
        budgetStatus: [],
      },
      { status: 200 }
    )
  }
}
