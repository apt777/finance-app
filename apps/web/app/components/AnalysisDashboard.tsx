'use client'

import React, { useEffect, useState } from 'react'
import { Link } from '@/navigation'
import { useAnalysisSummary } from '@/hooks/useAnalysisSummary'
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts'
import { ChartColumnIncreasing, ChevronRight, PiggyBank, Repeat, TriangleAlert } from 'lucide-react'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'
import AppLoadingState from '@/components/AppLoadingState'

export default function AnalysisDashboard() {
  const { theme } = useUiTheme()
  const { colorMode } = useColorMode()
  const { data, isLoading, isError } = useAnalysisSummary()
  const { data: recurringTransactions } = useRecurringTransactions()
  const { data: budgets } = useBudgets()
  const [selectedMonth, setSelectedMonth] = useState('')

  if (isLoading) {
    return <AppLoadingState label="분석" />
  }

  if (isError || !data) {
    const isDark = colorMode === 'dark'
    return (
      <div className={`mx-auto w-full rounded-[28px] p-5 md:p-8 ${theme === 'modern' ? isDark ? 'border border-rose-400/20 bg-rose-500/10 text-rose-200 shadow-sm' : 'border border-rose-200 bg-rose-50 text-rose-700 shadow-sm' : 'border border-red-200 bg-red-50 text-red-700'}`}>
        분석 데이터를 불러오지 못했습니다.
      </div>
    )
  }

  const hasNoAnalysisData =
    data.monthly.length === 0 &&
    data.yearly.length === 0 &&
    data.topCategories.length === 0 &&
    data.monthlyCategoryBreakdown.length === 0 &&
    data.budgetStatus.length === 0

  if (hasNoAnalysisData) {
    const isDark = colorMode === 'dark'
    return (
      <div className={`mx-auto w-full rounded-[28px] p-6 text-center md:p-10 ${theme === 'modern' ? isDark ? 'border border-white/10 bg-white/5 shadow-sm' : 'border border-white/80 bg-white/80 shadow-sm' : 'border border-slate-200 bg-white'}`}>
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${theme === 'modern' ? isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
          <ChartColumnIncreasing className="w-7 h-7" />
        </div>
        <h2 className={`text-xl font-bold md:text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>현재 데이터가 존재하지 않습니다.</h2>
        <p className={`mt-2 text-sm md:text-base ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          거래 내역이나 예산을 입력하면 월별 분석과 카테고리 분석이 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  const currentMonth = data.monthly[data.monthly.length - 1]
  const previousMonth = data.monthly[data.monthly.length - 2]
  const expenseDelta = currentMonth && previousMonth ? currentMonth.expense - previousMonth.expense : 0
  const overBudgetCount = data.budgetStatus.filter((item) => item.usagePercentage >= 100).length
  const monthlyOptions = data.monthlyCategoryBreakdown.map((item) => item.month)
  const selectedMonthValue = selectedMonth || monthlyOptions[monthlyOptions.length - 1] || currentMonth?.month || ''
  const selectedMonthBreakdown = data.monthlyCategoryBreakdown.find((item) => item.month === selectedMonthValue)
  const selectedMonthTotal = selectedMonthBreakdown?.categories.reduce((sum, item) => sum + item.amount, 0) ?? 0
  const activeBudgetCount = budgets?.length ?? 0
  const activeRecurringCount = recurringTransactions?.length ?? 0

  const isDark = colorMode === 'dark'
  const netTone = (currentMonth?.net ?? 0) >= 0
    ? isDark ? 'text-emerald-300' : 'text-emerald-600'
    : isDark ? 'text-rose-300' : 'text-rose-600'
  const expenseTone = expenseDelta > 0
    ? 'text-rose-600'
    : isDark ? 'text-emerald-300' : 'text-emerald-600'

  useEffect(() => {
    if (!selectedMonth && monthlyOptions.length > 0) {
      setSelectedMonth(monthlyOptions[monthlyOptions.length - 1] ?? '')
    }
  }, [monthlyOptions, selectedMonth])

  return (
    <div className={`space-y-6 ${theme === 'modern' ? isDark ? 'rounded-[34px] border border-white/10 bg-white/5 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-6' : 'rounded-[34px] border border-white/80 bg-white/50 p-4 shadow-[0_18px_50px_rgba(148,163,184,0.12)] backdrop-blur-xl md:p-6' : ''}`}>
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <article className={`rounded-3xl p-6 ${theme === 'modern' ? isDark ? 'border border-blue-400/20 bg-blue-500/10 text-white shadow-lg' : 'border border-blue-200 bg-blue-50 text-slate-950 shadow-sm' : 'bg-gradient-to-br from-slate-900 to-slate-800 text-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <ChartColumnIncreasing className="w-6 h-6" />
            <span className="text-xs text-slate-300">이번 달</span>
          </div>
          <p className="text-sm text-slate-300">순저축</p>
          <p className={`mt-2 text-3xl font-black ${netTone}`}>{Math.round(currentMonth?.net ?? 0).toLocaleString()}</p>
        </article>

        <article className={`rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <TriangleAlert className={`w-6 h-6 ${expenseDelta > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span className="text-xs text-slate-400">전월 대비</span>
          </div>
          <p className="text-sm text-slate-500">지출 변화</p>
          <p className={`text-3xl font-black mt-2 ${expenseTone}`}>
            {expenseDelta > 0 ? '+' : ''}{Math.round(expenseDelta).toLocaleString()}
          </p>
        </article>

        <Link href="/setup?step=2" className={`rounded-3xl border p-6 transition-all hover:-translate-y-0.5 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm hover:border-white/20 hover:bg-white/[0.08]' : 'border-white/80 bg-white/80 shadow-sm hover:bg-white hover:shadow-md' : 'border-slate-200 bg-white hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <PiggyBank className="w-6 h-6 text-amber-500" />
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">예산 설정</p>
          <p className={`text-3xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeBudgetCount}</p>
          <p className="text-xs text-slate-500 mt-2">
            {activeBudgetCount > 0 ? `초과 예산 ${overBudgetCount}개` : '월별 예산을 등록하고 초과 여부를 확인하세요'}
          </p>
        </Link>

        <Link href="/setup?step=3" className={`rounded-3xl border p-6 transition-all hover:-translate-y-0.5 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm hover:border-white/20 hover:bg-white/[0.08]' : 'border-white/80 bg-white/80 shadow-sm hover:bg-white hover:shadow-md' : 'border-slate-200 bg-white hover:shadow-md'}`}>
          <div className="flex items-center justify-between mb-4">
            <Repeat className="w-6 h-6 text-indigo-500" />
            <ChevronRight className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-sm text-slate-500">반복거래 설정</p>
          <p className={`text-3xl font-black mt-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{activeRecurringCount}</p>
          <p className="text-xs text-slate-500 mt-2">
            {activeRecurringCount > 0 ? '월세, 구독료, 급여처럼 반복되는 거래 관리' : '반복 거래를 등록해 입력 부담을 줄이세요'}
          </p>
        </Link>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <article className={`xl:col-span-3 rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">월별 현금흐름</h2>
            <p className="text-sm text-slate-500 mt-1">최근 12개월 기준 수입, 지출, 순저축 추이입니다.</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Bar dataKey="income" fill="#16a34a" radius={[8, 8, 0, 0]} />
              <Bar dataKey="expense" fill="#ef4444" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className={`xl:col-span-2 rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>월별 카테고리 분석</h2>
              <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>이번 달을 기본으로, 원하는 달의 지출 카테고리를 확인할 수 있습니다.</p>
            </div>
            <select
              value={selectedMonthValue}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium outline-none transition-all ${isDark ? 'border-white/10 bg-white/5 text-white focus:border-white/20' : 'border-slate-200 bg-slate-50 text-slate-900 focus:border-blue-300'}`}
            >
              {monthlyOptions.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-4">
            {(selectedMonthBreakdown?.categories ?? []).length === 0 && (
              <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>선택한 달의 카테고리 지출이 아직 없습니다.</p>
            )}
            {(selectedMonthBreakdown?.categories ?? []).map((category) => {
              const maxAmount = selectedMonthBreakdown?.categories[0]?.amount ?? 1
              const share = selectedMonthTotal > 0 ? Math.round((category.amount / selectedMonthTotal) * 100) : 0
              return (
                <div key={category.key}>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <span className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>{category.name}</span>
                      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{share}%</p>
                    </div>
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(category.amount).toLocaleString()}</span>
                  </div>
                  <div className={`w-full h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      style={{ width: `${(category.amount / maxAmount) * 100}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <article className={`xl:col-span-3 rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-6">
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>연도별 추이</h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>연도 단위로 수입과 지출 흐름을 비교합니다.</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data.yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="year" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={3} />
              <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} />
              <Line type="monotone" dataKey="net" stroke="#2563eb" strokeWidth={3} />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className={`xl:col-span-2 rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>예산 상태</h2>
                <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>현재 월 예산과 실제 지출을 비교합니다.</p>
              </div>
              <Link href="/setup?step=2" className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
                예산 설정
              </Link>
            </div>
          </div>
          <div className="space-y-4">
            {data.budgetStatus.length === 0 && (
              <div className={`rounded-2xl p-4 text-sm ${isDark ? 'border border-white/10 bg-white/5 text-slate-400' : 'border border-slate-200 bg-slate-50 text-slate-500'}`}>
                등록된 월 예산이 아직 없습니다. 예산을 추가하면 초과 여부와 사용률을 여기서 바로 확인할 수 있습니다.
              </div>
            )}
            {data.budgetStatus.map((budget) => (
              <div key={budget.id} className={`rounded-2xl p-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-slate-100' : 'text-slate-800'}`}>{budget.name}</p>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {Math.round(budget.actual).toLocaleString()} / {Math.round(budget.amount).toLocaleString()} {budget.currency}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${budget.usagePercentage >= 100 ? 'text-rose-600' : budget.usagePercentage >= budget.alertThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {budget.usagePercentage}%
                  </span>
                </div>
                <div className={`mt-3 h-2 w-full overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <div
                    className={`h-full rounded-full ${budget.usagePercentage >= 100 ? 'bg-rose-500' : budget.usagePercentage >= budget.alertThreshold ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(budget.usagePercentage, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
    </div>
  )
}
