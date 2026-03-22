import { NextResponse } from 'next/server'
import prisma from '@lib/prisma'
import { requireRouteSession } from '@/lib/server-auth'
import { ensureDefaultCategories } from '@/lib/categories'

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
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
    const transactionsPromise = prisma.transaction.findMany({
      where: {
        userId,
      },
      orderBy: { date: 'asc' },
    })

    const budgetsPromise = prisma.budget.findMany({
      where: { userId },
    }).catch(() => [])

    const [transactions, budgets, categories] = await Promise.all([
      transactionsPromise,
      budgetsPromise,
      ensureDefaultCategories(userId),
    ])

    const categoryMap = new Map(categories.map((category) => [category.key, category.name]))
    const categoryTypeMap = new Map(categories.map((category) => [category.key, category.type]))
    const monthlyMap = new Map<string, { month: string; income: number; expense: number; net: number }>()
    const categoryTotals = new Map<string, number>()
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
      const normalizedAmount = Math.abs(transaction.amount)

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
        name: categoryMap.get(key) ?? key,
        amount,
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
        .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)

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
      budgetStatus,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        monthly: [],
        yearly: [],
        topCategories: [],
        budgetStatus: [],
      },
      { status: 200 }
    )
  }
}
