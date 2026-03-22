'use client'

import React from 'react'
import { Link } from '@/navigation'
import { useOverviewData } from '../hooks/useOverviewData'
import { useExchangeRates, ExchangeRate } from '../hooks/useExchangeRates'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  PlusCircle,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useColorMode } from '@/context/ColorModeContext'
import AppLoadingState from '@/components/AppLoadingState'

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

const tooltipStyle = {
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '16px',
  color: '#f8fafc',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.18)',
}

export default function OverviewModern() {
  const { colorMode } = useColorMode()
  const tDashboard = useTranslations('dashboard')
  const tAccounts = useTranslations('accounts')
  const tHoldings = useTranslations('holdings')
  const tGoals = useTranslations('goals')
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')

  const { data, isLoading, isError } = useOverviewData()
  const { data: exchangeRates, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  const isDark = colorMode === 'dark'

  if (isLoading || ratesLoading) {
    return <AppLoadingState label={tDashboard('title')} />
  }

  if (isError || ratesError) {
    return (
      <div className="min-h-screen px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1680px] rounded-[32px] border border-rose-200 bg-rose-50 p-10 text-center text-rose-700">
          <p className="text-lg font-semibold">{tCommon('error')}</p>
        </div>
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
  const hasExchangeRates = rates.length > 0

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((item) => item.fromCurrency === currency && item.toCurrency === BASE_CURRENCY)?.rate
    if (rate) return amount * rate

    // Avoid collapsing the whole dashboard to zero while initial exchange-rate
    // data is still empty in production.
    return hasExchangeRates ? 0 : amount
  }

  const totalNonCreditBalancesByCurrency: Record<string, number> = {}
  accounts.forEach((account) => {
    if (account.type !== 'credit_card') {
      totalNonCreditBalancesByCurrency[account.currency] = (totalNonCreditBalancesByCurrency[account.currency] || 0) + account.balance
    }
  })

  const totalBalanceByCurrency = accounts.reduce<Record<string, number>>((acc, account) => {
    acc[account.currency] = (acc[account.currency] || 0) + account.balance
    return acc
  }, {})

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
  const japaneseAccountsTotal = totalNonCreditBalancesByCurrency.JPY || 0
  const koreanAccountsTotal = totalNonCreditBalancesByCurrency.KRW || 0
  const usesEstimatedValues = !hasExchangeRates && (
    accounts.some((account) => account.currency !== BASE_CURRENCY) ||
    holdings.some((holding) => holding.currency !== BASE_CURRENCY)
  )

  const goalsWithProgress = goals.map((goal) => ({
    ...goal,
    progress: goal.targetAmount > 0 ? Math.round((goal.currentAmount / goal.targetAmount) * 100) : 0,
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

  const latestExpenses = chartData.at(-1)?.expenses || 0
  const previousExpenses = chartData.at(-2)?.expenses || 0
  const expenseMomentum = latestExpenses - previousExpenses
  const totalExpensesLast30 = Math.round(chartData.reduce((sum, item) => sum + item.expenses, 0))
  const holdingsValueBaseCurrency = Math.round(
    holdings.reduce((sum, holding) => sum + convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency), 0),
  )
  const averageGoalProgress = goalsWithProgress.length > 0
    ? Math.round(goalsWithProgress.reduce((sum, goal) => sum + goal.progress, 0) / goalsWithProgress.length)
    : 0
  const expenseDirectionLabel = expenseMomentum > 0 ? '지출이 늘고 있어요' : '지출이 안정적이에요'
  const expenseDirectionTone = expenseMomentum > 0
    ? 'text-rose-600'
    : isDark
      ? 'text-emerald-300'
      : 'text-emerald-600'
  const quickActions = [
    {
      href: '/transactions/add',
      eyebrow: '빠른 추가',
      title: '거래내역 추가',
      description: '지출, 수입, 이체를 바로 기록',
      icon: PlusCircle,
      lightAccent: 'bg-blue-100 text-blue-700',
      darkAccent: 'bg-blue-500/15 text-blue-300',
    },
    {
      href: '/accounts/add',
      eyebrow: '자산 설정',
      title: '계좌 추가',
      description: '새 계좌나 카드 연결',
      icon: Wallet,
      lightAccent: 'bg-emerald-100 text-emerald-700',
      darkAccent: 'bg-emerald-500/15 text-emerald-300',
    },
    {
      href: '/holdings/add',
      eyebrow: '포트폴리오',
      title: '투자 추가',
      description: '보유 종목을 빠르게 등록',
      icon: TrendingUp,
      lightAccent: 'bg-amber-100 text-amber-700',
      darkAccent: 'bg-amber-500/15 text-amber-300',
    },
  ] as const

  return (
    <div className="space-y-8">
      <div className="mx-auto max-w-[1680px] space-y-6">
        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(420px,0.82fr)]">
          <div className={`overflow-hidden rounded-[40px] p-6 md:p-8 ${isDark ? 'border border-white/10 bg-[linear-gradient(180deg,rgba(24,27,31,0.98)_0%,rgba(31,35,40,0.98)_100%)] shadow-[0_24px_60px_rgba(0,0,0,0.28)]' : 'border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(237,243,255,0.9)_36%,_rgba(211,226,255,0.88)_100%)] shadow-[0_24px_80px_rgba(59,130,246,0.16)]'}`}>
            <div className="space-y-6">
              <div className="max-w-4xl space-y-6">
                <div className="space-y-3">
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    자산 요약
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${isDark ? 'border border-white/10 bg-white/5 text-slate-200' : 'border border-white/80 bg-white/80 text-slate-700'}`}>
                      <TrendingUp className={`h-4 w-4 ${expenseMomentum > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
                      <span className={expenseDirectionTone}>{expenseDirectionLabel}</span>
                    </div>
                    <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${isDark ? 'border border-white/10 bg-white/5 text-slate-300' : 'border border-white/80 bg-white/80 text-slate-600'}`}>
                      최근 30일 기준
                    </div>
                    {usesEstimatedValues ? (
                      <div className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium ${isDark ? 'border border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border border-amber-200 bg-amber-50 text-amber-700'}`}>
                        환율 동기화 전 추정값
                      </div>
                    ) : null}
                  </div>
                </div>
                <h2 className={`mt-5 max-w-4xl text-[clamp(2.05rem,4.3vw,3.45rem)] font-bold leading-[1.02] tracking-[-0.015em] ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  {Math.round(netWorth).toLocaleString()} <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{BASE_CURRENCY}</span>
                </h2>
                <p className={`max-w-2xl text-sm leading-7 md:text-base ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  오늘 자산 상태와 최근 소비 흐름을 한 번에 보고, 어디를 먼저 손봐야 하는지 빠르게 판단할 수 있게 정리했습니다.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className={`flex min-h-[112px] flex-col justify-between rounded-[24px] px-4 py-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/75'}`}>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>최근 30일 지출</p>
                    <p className={`mt-2 text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {totalExpensesLast30.toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex min-h-[112px] flex-col justify-between rounded-[24px] px-4 py-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/75'}`}>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>투자</p>
                    <p className={`mt-2 text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {holdingsValueBaseCurrency.toLocaleString()}
                    </p>
                  </div>
                  <div className={`flex min-h-[112px] flex-col justify-between rounded-[24px] px-4 py-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/75'}`}>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>목표 평균 진행률</p>
                    <p className={`mt-2 text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {averageGoalProgress}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {quickActions.map((action) => {
                    const ActionIcon = action.icon

                    return (
                      <Link
                        key={action.href}
                        href={action.href}
                        className={`group flex min-h-[124px] flex-col justify-between rounded-[24px] px-4 py-4 transition-all ${
                          isDark
                            ? 'border border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]'
                            : 'border border-white/80 bg-white/82 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{action.eyebrow}</p>
                            <p className={`mt-3 text-base font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>{action.title}</p>
                          </div>
                          <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDark ? action.darkAccent : action.lightAccent}`}>
                            <ActionIcon className="h-5 w-5" />
                          </span>
                        </div>
                        <div className="space-y-2">
                          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{action.description}</p>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            isDark
                              ? 'bg-white/10 text-slate-200 group-hover:bg-white/15'
                              : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
                          }`}>
                            바로 이동
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>

                <div className={`rounded-[28px] px-5 py-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/75'}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>지금 보면 좋은 포인트</p>
                      <p className={`mt-2 text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {expenseMomentum > 0
                          ? '최근 지출이 직전 흐름보다 커졌습니다. 소비가 늘어난 카테고리를 먼저 확인해보는 게 좋습니다.'
                          : '지출 흐름이 비교적 안정적입니다. 남는 현금을 목표나 투자 쪽으로 옮길 여지가 있습니다.'}
                      </p>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 text-right ${isDark ? 'bg-white/5 text-white' : 'bg-slate-100 text-slate-900'}`}>
                      <p className="text-xs font-semibold text-slate-400">순자산 기준</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">{Math.round(netWorth).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className={`flex min-h-[122px] flex-col justify-between rounded-[28px] px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/80'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tAccounts('totalAccounts')}</p>
                  <p className={`mt-3 text-[clamp(1.08rem,1.8vw,1.55rem)] font-bold leading-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    {accounts.length}
                  </p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>연결된 계좌 수</p>
                </div>
                <div className={`flex min-h-[122px] flex-col justify-between rounded-[28px] px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/80'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tDashboard('totalAssets')}</p>
                  <p className={`mt-3 text-[clamp(1.08rem,1.8vw,1.55rem)] font-bold leading-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    {Math.round(totalPositiveAssetsBaseCurrency).toLocaleString()}
                  </p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>투자 자산 합계</p>
                </div>
                <div className={`flex min-h-[122px] flex-col justify-between rounded-[28px] px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/80'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tTransactions('totalExpense')}</p>
                  <p className={`mt-3 text-[clamp(1.08rem,1.8vw,1.55rem)] font-bold leading-tight tabular-nums ${expenseMomentum > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {expenseMomentum > 0 ? '+' : ''}
                    {Math.round(expenseMomentum).toLocaleString()}
                  </p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>최근 지출 변화</p>
                </div>
                <div className={`flex min-h-[122px] flex-col justify-between rounded-[28px] px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/80'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>KRW Mirror</p>
                  <p className={`mt-3 text-[clamp(1.18rem,2vw,1.8rem)] font-bold leading-tight tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                    {Math.round(totalPositiveAssetsKRW).toLocaleString()}
                  </p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>원화 기준 참고 자산</p>
                </div>
                <div className={`flex min-h-[122px] flex-col justify-between rounded-[28px] px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5 text-white' : 'border border-slate-200 bg-blue-50 text-slate-950'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-blue-600/70'}`}>{tGoals('totalGoals')}</p>
                  <p className="mt-3 text-[clamp(1.18rem,2vw,1.8rem)] font-bold leading-tight tabular-nums">
                    {goals.length}
                  </p>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-blue-700/70'}`}>활성 목표 수</p>
                </div>
                <div className={`flex min-h-[122px] flex-col justify-between rounded-[28px] px-5 py-4 shadow-sm ${isDark ? 'border border-white/10 bg-white/5' : 'border border-white/80 bg-white/80'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>현금 잔고</p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tDashboard('japaneseAccounts')}</span>
                      <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        {Math.round(japaneseAccountsTotal).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{tDashboard('koreanAccounts')}</span>
                      <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>
                        {Math.round(koreanAccountsTotal).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <p className={`mt-2 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>통화별 현금 잔고</p>
                </div>
              </div>
            </div>

          </div>

          <div className="space-y-6">
            <div className={`rounded-[36px] p-6 backdrop-blur-xl ${isDark ? 'border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]' : 'border border-white/80 bg-white/80 shadow-[0_18px_60px_rgba(148,163,184,0.12)]'}`}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tDashboard('last30Days')}</p>
                  <h3 className={`mt-2 text-[1.65rem] font-bold tracking-[-0.015em] ${isDark ? 'text-white' : 'text-slate-950'}`}>{tDashboard('basicAnalysis')}</h3>
                </div>
                <div className={`rounded-2xl px-3 py-2 text-sm font-bold ${expenseMomentum > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {expenseMomentum > 0 ? '+' : ''}
                  {Math.round(expenseMomentum).toLocaleString()}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{tTransactions('totalExpense')}</p>
                  <p className="mt-3 text-2xl font-bold text-rose-600 tabular-nums">
                    {totalExpensesLast30.toLocaleString()}
                  </p>
                </div>
                <div className={`rounded-[24px] p-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <p className={`text-[11px] uppercase tracking-[0.18em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{tHoldings('totalHoldings')}</p>
                  <p className={`mt-3 text-2xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>{holdings.length}</p>
                </div>
              </div>

              <div className="mt-5 h-[220px]">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="expenseFill" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#2563eb" stopOpacity={0.34} />
                          <stop offset="100%" stopColor="#2563eb" stopOpacity={0.04} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} />
                      <YAxis stroke="#94a3b8" tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Area dataKey="expenses" fill="url(#expenseFill)" stroke="#2563eb" strokeWidth={3} type="monotone" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-[24px] bg-slate-50 text-sm text-slate-500">
                    {tTransactions('noTransactions')}
                  </div>
                )}
              </div>
            </div>

            <div className={`rounded-[36px] p-6 shadow-[0_18px_60px_rgba(15,23,42,0.22)] ${isDark ? 'border border-white/10 bg-white/5 text-white' : 'border border-blue-100 bg-blue-50/80 text-slate-950'}`}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${isDark ? 'text-slate-400' : 'text-blue-600/70'}`}>{tDashboard('goalSummary')}</p>
                  <h3 className="mt-2 text-[1.65rem] font-bold tracking-[-0.015em]">Focus now</h3>
                </div>
                <Target className="h-6 w-6 text-slate-400" />
              </div>
              <div className="space-y-4">
                {goalsWithProgress.length > 0 ? (
                  goalsWithProgress.slice(0, 3).map((goal) => (
                    <div key={goal.id} className={`rounded-[24px] p-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-blue-100 bg-white/80'}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{goal.name}</span>
                        <span className={`text-sm font-bold ${isDark ? 'text-blue-300' : 'text-blue-600'}`}>{goal.progress}%</span>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300"
                          style={{ width: `${Math.min(goal.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`rounded-[24px] p-5 text-sm ${isDark ? 'border border-white/10 bg-white/5 text-slate-400' : 'border border-blue-100 bg-white/80 text-slate-500'}`}>
                    {tGoals('noGoals')}
                  </div>
                )}
              </div>
              <Link
                href="/settings?tab=beta"
                className={`mt-4 flex min-h-[112px] flex-col justify-between rounded-[24px] p-4 transition-all ${
                  isDark
                    ? 'border border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08]'
                    : 'border border-blue-100 bg-white/85 hover:-translate-y-0.5 hover:bg-white hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-blue-600/75'}`}>Beta shortcut</p>
                    <p className={`mt-2 text-base font-bold ${isDark ? 'text-white' : 'text-slate-950'}`}>AI로 등록하기</p>
                  </div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isDark ? 'bg-cyan-500/15 text-cyan-300' : 'bg-cyan-100 text-cyan-700'}`}>
                    <Sparkles className="h-5 w-5" />
                  </span>
                </div>
                <div>
                  <p className={`text-xs leading-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    여러 건의 거래를 붙여넣고 카테고리까지 한 번에 초안으로 정리할 수 있습니다.
                  </p>
                  <span className={`mt-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    isDark ? 'bg-white/10 text-slate-200' : 'bg-blue-100 text-blue-700'
                  }`}>
                    Beta 열기
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className={`rounded-[36px] p-6 backdrop-blur-xl ${isDark ? 'border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]' : 'border border-white/80 bg-white/75 shadow-[0_18px_60px_rgba(148,163,184,0.12)]'}`}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tAccounts('title')}</p>
                <h3 className={`mt-2 text-[1.65rem] font-bold tracking-[-0.015em] ${isDark ? 'text-white' : 'text-slate-950'}`}>{tDashboard('investmentSummary')}</h3>
              </div>
              <Wallet className="h-6 w-6 text-slate-400" />
            </div>
            <div className="space-y-3">
              {Object.entries(totalBalanceByCurrency).map(([currency, balance]) => (
                <div key={currency} className={`flex items-center justify-between rounded-[24px] px-4 py-4 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>{currency}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>currency bucket</p>
                  </div>
                  <p className={`text-xl font-bold tabular-nums ${isDark ? 'text-white' : 'text-slate-950'}`}>{Math.round(balance).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={`rounded-[36px] p-6 backdrop-blur-xl ${isDark ? 'border border-white/10 bg-white/5 shadow-[0_18px_40px_rgba(0,0,0,0.24)]' : 'border border-white/80 bg-white/75 shadow-[0_18px_60px_rgba(148,163,184,0.12)]'}`}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tDashboard('totalTransactions')}</p>
                <h3 className={`mt-2 text-[1.65rem] font-bold tracking-[-0.015em] ${isDark ? 'text-white' : 'text-slate-950'}`}>Expense split</h3>
              </div>
              <TrendingDown className="h-6 w-6 text-slate-400" />
            </div>
            <div className="h-[280px]">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData.slice(-8)}>
                    <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} />
                    <YAxis stroke="#94a3b8" tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="expenses" fill="#0f172a" radius={[16, 16, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-[24px] bg-slate-50 text-sm text-slate-500">
                  {tTransactions('noTransactions')}
                </div>
              )}
            </div>
          </article>
        </section>
      </div>
    </div>
  )
}
