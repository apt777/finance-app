'use client'

import React from 'react'
import { useAnalysisSummary } from '@/hooks/useAnalysisSummary'
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions'
import { useBudgets } from '@/hooks/useBudgets'
import { BarChart, Bar, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LineChart, Line } from 'recharts'
import { ChartColumnIncreasing, PiggyBank, Repeat, TriangleAlert } from 'lucide-react'

export default function AnalysisDashboard() {
  const { data, isLoading, isError } = useAnalysisSummary()
  const { data: recurringTransactions } = useRecurringTransactions()
  const { data: budgets } = useBudgets()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-72">
        <div className="w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin" />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-3xl p-8 text-red-700">
        분석 데이터를 불러오지 못했습니다.
      </div>
    )
  }

  const hasNoAnalysisData =
    data.monthly.length === 0 &&
    data.yearly.length === 0 &&
    data.topCategories.length === 0 &&
    data.budgetStatus.length === 0

  if (hasNoAnalysisData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-4">
          <ChartColumnIncreasing className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">현재 데이터가 존재하지 않습니다.</h2>
        <p className="text-slate-500 mt-2">
          거래 내역이나 예산을 입력하면 월별 분석과 카테고리 분석이 여기에 표시됩니다.
        </p>
      </div>
    )
  }

  const currentMonth = data.monthly[data.monthly.length - 1]
  const previousMonth = data.monthly[data.monthly.length - 2]
  const expenseDelta = currentMonth && previousMonth ? currentMonth.expense - previousMonth.expense : 0
  const overBudgetCount = data.budgetStatus.filter((item) => item.usagePercentage >= 100).length

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <article className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
          <div className="flex items-center justify-between mb-4">
            <ChartColumnIncreasing className="w-6 h-6" />
            <span className="text-xs text-slate-300">이번 달</span>
          </div>
          <p className="text-sm text-slate-300">순저축</p>
          <p className="text-3xl font-black mt-2">{Math.round(currentMonth?.net ?? 0).toLocaleString()}</p>
        </article>

        <article className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <TriangleAlert className={`w-6 h-6 ${expenseDelta > 0 ? 'text-rose-500' : 'text-emerald-500'}`} />
            <span className="text-xs text-slate-400">전월 대비</span>
          </div>
          <p className="text-sm text-slate-500">지출 변화</p>
          <p className={`text-3xl font-black mt-2 ${expenseDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            {expenseDelta > 0 ? '+' : ''}{Math.round(expenseDelta).toLocaleString()}
          </p>
        </article>

        <article className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <PiggyBank className="w-6 h-6 text-amber-500" />
            <span className="text-xs text-slate-400">예산</span>
          </div>
          <p className="text-sm text-slate-500">등록된 예산</p>
          <p className="text-3xl font-black mt-2 text-slate-900">{budgets?.length ?? 0}</p>
          <p className="text-xs text-slate-500 mt-2">초과 예산 {overBudgetCount}개</p>
        </article>

        <article className="rounded-3xl bg-white border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <Repeat className="w-6 h-6 text-indigo-500" />
            <span className="text-xs text-slate-400">자동 입력 보조</span>
          </div>
          <p className="text-sm text-slate-500">반복거래</p>
          <p className="text-3xl font-black mt-2 text-slate-900">{recurringTransactions?.length ?? 0}</p>
        </article>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <article className="xl:col-span-3 bg-white rounded-3xl border border-slate-200 p-6">
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

        <article className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">카테고리 지출 비중</h2>
            <p className="text-sm text-slate-500 mt-1">지출이 큰 카테고리부터 확인할 수 있습니다.</p>
          </div>
          <div className="space-y-4">
            {data.topCategories.map((category) => {
              const maxAmount = data.topCategories[0]?.amount ?? 1
              return (
                <div key={category.key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-slate-700">{category.name}</span>
                    <span className="text-sm font-bold text-slate-900">{Math.round(category.amount).toLocaleString()}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
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
        <article className="xl:col-span-3 bg-white rounded-3xl border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">연도별 추이</h2>
            <p className="text-sm text-slate-500 mt-1">연도 단위로 수입과 지출 흐름을 비교합니다.</p>
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

        <article className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">예산 상태</h2>
            <p className="text-sm text-slate-500 mt-1">현재 월 예산과 실제 지출을 비교합니다.</p>
          </div>
          <div className="space-y-4">
            {data.budgetStatus.length === 0 && (
              <p className="text-sm text-slate-500">등록된 월 예산이 아직 없습니다.</p>
            )}
            {data.budgetStatus.map((budget) => (
              <div key={budget.id} className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-800">{budget.name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {Math.round(budget.actual).toLocaleString()} / {Math.round(budget.amount).toLocaleString()} {budget.currency}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${budget.usagePercentage >= 100 ? 'text-rose-600' : budget.usagePercentage >= budget.alertThreshold ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {budget.usagePercentage}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-100 mt-3 overflow-hidden">
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
