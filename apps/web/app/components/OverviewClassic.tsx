'use client'

import React from 'react'
import { useOverviewData } from '../hooks/useOverviewData'
import { useExchangeRates, ExchangeRate } from '../hooks/useExchangeRates'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from '@/navigation'
import { TrendingUp, TrendingDown, Wallet, Target, PlusCircle, ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Account {
  id: string
  name: string
  type: string
  balance: number
  currency: string
}

interface Transaction {
  id: string
  accountId: string
  date: string
  description: string
  amount: number
  currency: string
}

interface Holding {
  id: string
  accountId: string
  symbol: string
  shares: number
  costBasis: number
  currency: string
}

interface Goal {
  id: string
  userId: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate?: string
}

interface OverviewData {
  accounts: Account[]
  transactions: Transaction[]
  holdings: Holding[]
  goals: Goal[]
}

interface ChartData {
  date: string
  expenses: number
}

export default function OverviewClassic() {
  const tDashboard = useTranslations('dashboard')
  const tAccounts = useTranslations('accounts')
  const tHoldings = useTranslations('holdings')
  const tGoals = useTranslations('goals')
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')

  const { data, isLoading, isError } = useOverviewData()
  const { data: exchangeRates, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  if (isLoading || ratesLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
          <p className="text-slate-600">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  if (isError || ratesError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="font-medium text-red-600">{tCommon('error')}</p>
      </div>
    )
  }

  const overviewData = data as OverviewData
  const accounts = overviewData.accounts || []
  const holdings = overviewData.holdings || []
  const goals = overviewData.goals || []
  const transactions = overviewData.transactions || []
  const rates: ExchangeRate[] = exchangeRates || []
  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((item) => item.fromCurrency === currency && item.toCurrency === BASE_CURRENCY)?.rate
    return rate ? amount * rate : 0
  }

  const totalBalanceByCurrency = accounts.reduce<Record<string, number>>((acc, account) => {
    acc[account.currency] = (acc[account.currency] || 0) + account.balance
    return acc
  }, {})

  const totalNonCreditBalancesByCurrency: Record<string, number> = {}
  accounts.forEach((account) => {
    if (account.type !== 'credit_card') {
      totalNonCreditBalancesByCurrency[account.currency] = (totalNonCreditBalancesByCurrency[account.currency] || 0) + account.balance
    }
  })

  const japaneseAccountsTotal = totalNonCreditBalancesByCurrency.JPY || 0
  const koreanAccountsTotal = totalNonCreditBalancesByCurrency.KRW || 0

  const creditLiabilities = new Map<string, number>()
  accounts.forEach((account) => {
    if (account.type === 'credit_card' && account.balance > 0) {
      creditLiabilities.set(account.currency, (creditLiabilities.get(account.currency) || 0) + account.balance)
    }
  })

  let netWorth = 0
  accounts.forEach((account) => {
    const convertedBalance = convertToBaseCurrency(account.balance, account.currency)
    netWorth += account.type === 'credit_card' ? -convertedBalance : convertedBalance
  })
  holdings.forEach((holding) => {
    netWorth += convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
  })

  let totalPositiveAssetsBaseCurrency = 0
  Object.entries(totalNonCreditBalancesByCurrency).forEach(([currency, amount]) => {
    totalPositiveAssetsBaseCurrency += convertToBaseCurrency(amount, currency)
  })

  const rateJPYToKRW = rates.find((item) => item.fromCurrency === 'JPY' && item.toCurrency === 'KRW')?.rate || 0
  const totalPositiveAssetsKRW = totalPositiveAssetsBaseCurrency * rateJPYToKRW

  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    progress: Math.round((goal.currentAmount / goal.targetAmount) * 100),
  }))

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const expensesLast30Days = transactions
    .filter((transaction) => new Date(transaction.date) >= thirtyDaysAgo && transaction.amount < 0)
    .reduce<Record<string, number>>((acc, transaction) => {
      const date = new Date(transaction.date).toISOString().split('T')[0] ?? ''
      acc[date] = (acc[date] || 0) + convertToBaseCurrency(Math.abs(transaction.amount), transaction.currency)
      return acc
    }, {})

  const chartData: ChartData[] = Object.keys(expensesLast30Days)
    .map((date) => ({
      date,
      expenses: Math.round(expensesLast30Days[date] || 0),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="card-hover rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg transition-all duration-200 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
              <Wallet className="h-6 w-6" />
            </div>
            <TrendingUp className="h-5 w-5 text-white/70" />
          </div>
          <p className="mb-1 text-sm text-white/80">{tDashboard('totalAssets')} (JPY)</p>
          <p className="text-3xl font-bold tabular-nums">{Math.round(totalPositiveAssetsBaseCurrency).toLocaleString()}</p>
          <p className="mt-2 text-xs text-white/70">≈ {Math.round(totalPositiveAssetsKRW).toLocaleString()} KRW</p>
        </div>

        <div className="card-hover rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-purple-600">
              <span className="text-lg font-bold text-white">¥</span>
            </div>
          </div>
          <p className="mb-1 text-sm text-slate-600">{tDashboard('japaneseAccounts')}</p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{Math.round(japaneseAccountsTotal).toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">JPY</p>
          {creditLiabilities.has('JPY') && (
            <p className="mt-2 text-sm font-semibold text-red-500">
              {tCommon('liability')}: -{Math.round(creditLiabilities.get('JPY') || 0).toLocaleString()}
            </p>
          )}
        </div>

        <div className="card-hover rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600">
              <span className="text-lg font-bold text-white">₩</span>
            </div>
          </div>
          <p className="mb-1 text-sm text-slate-600">{tDashboard('koreanAccounts')}</p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{Math.round(koreanAccountsTotal).toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">KRW</p>
          {creditLiabilities.has('KRW') && (
            <p className="mt-2 text-sm font-semibold text-red-500">
              {tCommon('liability')}: -{Math.round(creditLiabilities.get('KRW') || 0).toLocaleString()}
            </p>
          )}
        </div>

        <div className="card-hover rounded-2xl border border-slate-200 bg-white p-6 shadow-lg transition-all duration-200 hover:shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-orange-600">
              <Wallet className="h-6 w-6 text-white" />
            </div>
          </div>
          <p className="mb-1 text-sm text-slate-600">{tAccounts('totalAccounts')}</p>
          <p className="text-3xl font-bold text-slate-800 tabular-nums">{accounts.length}</p>
          <div className="mt-3 space-y-1">
            {Object.entries(totalBalanceByCurrency).slice(0, 2).map(([currency, balance]) => (
              <p key={currency} className="text-xs text-slate-500">
                {currency}: {Math.round(balance).toLocaleString()}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-800">{tDashboard('last30Days')}</h3>
              <p className="mt-1 text-sm text-slate-500">{tDashboard('unit')}: {BASE_CURRENCY}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-500">
              <TrendingDown className="h-5 w-5 text-white" />
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748b" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Line
                  activeDot={{ r: 6 }}
                  dataKey="expenses"
                  dot={{ fill: '#3b82f6', r: 4 }}
                  stroke="#3b82f6"
                  strokeWidth={3}
                  type="monotone"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-64 items-center justify-center text-slate-400">
              <p>{tTransactions('noTransactions')}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{tDashboard('investmentSummary')}</h3>
                <p className="mt-1 text-sm text-slate-500">{tHoldings('totalHoldings')}: {holdings.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            {holdings.length > 0 ? (
              <div className="space-y-2">
                {holdings.slice(0, 3).map((holding) => (
                  <div key={holding.id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="font-medium text-slate-700">{holding.symbol}</span>
                    <span className="text-sm text-slate-600">
                      {holding.shares} x {holding.costBasis.toLocaleString()} {holding.currency}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-slate-400">{tHoldings('noHoldings')}</p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">{tDashboard('goalSummary')}</h3>
                <p className="mt-1 text-sm text-slate-500">{tGoals('totalGoals')}: {goals.length}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
            {goalsWithProgress.length > 0 ? (
              <div className="space-y-3">
                {goalsWithProgress.slice(0, 3).map((goal) => (
                  <div key={goal.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{goal.name}</span>
                      <span className="text-sm font-bold text-blue-600">{goal.progress}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                        style={{ width: `${Math.min(goal.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-slate-400">{tGoals('noGoals')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 p-8 shadow-xl">
        <h3 className="mb-6 text-2xl font-bold text-white">{tDashboard('quickActions')}</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link
            href="/transactions/add"
            className="group rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20"
          >
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500">
                <PlusCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{tDashboard('addTransaction')}</p>
                <p className="text-xs text-white/70">{tDashboard('newTransaction')}</p>
              </div>
            </div>
          </Link>
          <Link
            href="/accounts/add"
            className="group rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20"
          >
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <Wallet className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{tDashboard('addAccount')}</p>
                <p className="text-xs text-white/70">{tDashboard('newAccount')}</p>
              </div>
            </div>
          </Link>
          <Link
            href="/holdings/add"
            className="group rounded-xl border border-white/20 bg-white/10 p-6 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/20"
          >
            <div className="flex items-center space-x-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white">{tDashboard('addInvestment')}</p>
                <p className="text-xs text-white/70">{tDashboard('newInvestment')}</p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h3 className="mb-2 text-2xl font-bold text-slate-800">{tDashboard('basicAnalysis')}</h3>
            <p className="text-slate-600">{tDashboard('analysisDesc')}</p>
          </div>
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500">
            <ArrowUpRight className="h-6 w-6 text-white" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
            <p className="mb-2 text-sm text-slate-600">{tDashboard('totalTransactions')}</p>
            <p className="text-3xl font-bold text-blue-600 tabular-nums">{transactions.length}</p>
          </div>
          <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6">
            <p className="mb-2 text-sm text-slate-600">{tDashboard('activeAccounts')}</p>
            <p className="text-3xl font-bold text-purple-600 tabular-nums">{accounts.length}</p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 p-6">
            <p className="mb-2 text-sm text-slate-600">{tDashboard('investmentPortfolio')}</p>
            <p className="text-3xl font-bold text-emerald-600 tabular-nums">{holdings.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
