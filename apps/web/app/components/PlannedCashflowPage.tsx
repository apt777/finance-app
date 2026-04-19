'use client'

import React from 'react'
import { Link } from '@/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeftRight, ChevronLeft, CreditCard, PiggyBank, Wallet } from 'lucide-react'
import { useLocale } from 'next-intl'
import { useColorMode } from '@/context/ColorModeContext'
import { useCurrencyPreferences } from '@/context/CurrencyPreferenceContext'
import { useUiTheme } from '@/context/UiThemeContext'
import AppLoadingState from '@/components/AppLoadingState'
import { getUiCopy } from '@/lib/uiCopy'
import { usePlannedCashflowForecast } from '@/hooks/usePlannedCashflowForecast'

async function saveExpectedIncome(baseCurrency: string, months: Record<string, number>) {
  const response = await fetch('/api/forecast/planned-cashflow', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ baseCurrency, months }),
  })

  if (!response.ok) {
    throw new Error('Failed to save expected income')
  }

  return response.json()
}

export default function PlannedCashflowPage() {
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const { theme } = useUiTheme()
  const { colorMode } = useColorMode()
  const { baseCurrency } = useCurrencyPreferences()
  const queryClient = useQueryClient()
  const isDark = colorMode === 'dark'
  const { data, isLoading, isError } = usePlannedCashflowForecast(baseCurrency)
  const [draftIncome, setDraftIncome] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (!data) return

    const nextDraft = data.months.reduce<Record<string, string>>((acc, month) => {
      acc[month.month] = String(data.expectedIncomeByCurrency?.[baseCurrency]?.[month.month] || '')
      return acc
    }, {})
    setDraftIncome(nextDraft)
  }, [baseCurrency, data])

  const saveMutation = useMutation({
    mutationFn: (months: Record<string, number>) => saveExpectedIncome(baseCurrency, months),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planned-cashflow-forecast', baseCurrency] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
  })

  if (isLoading) {
    return <AppLoadingState label={ui.analysis.plannedCashflowTitle} />
  }

  if (isError || !data) {
    return (
      <div className={`rounded-[28px] p-6 ${isDark ? 'border border-rose-400/20 bg-rose-500/10 text-rose-200' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}>
        {ui.analysis.categoryPageError}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 ${theme === 'modern' ? isDark ? 'border border-white/10 bg-white/5 shadow-sm' : 'border border-white/80 bg-white/80 shadow-sm' : 'border border-slate-200 bg-white'}`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              <ArrowLeftRight className="h-6 w-6" />
            </div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{ui.analysis.plannedCashflowTitle}</h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ui.analysis.plannedCashflowDesc}</p>
          </div>
          <Link
            href="/analysis"
            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
          >
            <ChevronLeft className="h-4 w-4" />
            {ui.analysis.backToAnalysis}
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <article className={`rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-4 flex items-center justify-between">
            <Wallet className={`h-6 w-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`} />
            <span className="text-xs text-slate-400">{baseCurrency}</span>
          </div>
          <p className="text-sm text-slate-500">{ui.analysis.openingBalance}</p>
          <p className={`mt-2 text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(data.openingBalance).toLocaleString()}</p>
        </article>

        <article className={`rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-4 flex items-center justify-between">
            <PiggyBank className="h-6 w-6 text-emerald-500" />
            <span className="text-xs text-slate-400">{baseCurrency}</span>
          </div>
          <p className="text-sm text-slate-500">{ui.analysis.netCashflow}</p>
          <p className={`mt-2 text-3xl font-black ${(data.months[0]?.net ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {Math.round(data.months[0]?.net || 0).toLocaleString()}
          </p>
        </article>

        <article className={`rounded-3xl border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
          <div className="mb-4 flex items-center justify-between">
            <CreditCard className="h-6 w-6 text-amber-500" />
            <span className="text-xs text-slate-400">{baseCurrency}</span>
          </div>
          <p className="text-sm text-slate-500">{ui.analysis.projectedBalance}</p>
          <p className={`mt-2 text-3xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {Math.round(data.months[data.months.length - 1]?.projectedBalance || data.openingBalance).toLocaleString()}
          </p>
        </article>
      </section>

      <section className={`rounded-[32px] border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
        <div className="mb-6 flex flex-col gap-2">
          <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{ui.analysis.expectedIncomeTitle}</h2>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ui.analysis.expectedIncomeDesc(baseCurrency)}</p>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.months.map((month) => (
            <label key={month.month} className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-slate-50'}`}>
              <span className={`block text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{month.month}</span>
              <div className="relative mt-3">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={draftIncome[month.month] || ''}
                  onChange={(event) => setDraftIncome((current) => ({ ...current, [month.month]: event.target.value }))}
                  className={`w-full rounded-2xl border px-4 py-3 pr-16 outline-none ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-white text-slate-900'}`}
                  placeholder="0"
                />
                <span className="absolute right-4 top-3 text-sm font-semibold text-slate-500">{baseCurrency}</span>
              </div>
            </label>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="text-sm">
            {saveMutation.isSuccess ? <span className="text-emerald-600">{ui.analysis.forecastSaved}</span> : null}
          </div>
          <button
            type="button"
            onClick={() =>
              saveMutation.mutate(
                Object.entries(draftIncome).reduce<Record<string, number>>((acc, [month, amount]) => {
                  const normalizedAmount = Number(amount)
                  if (Number.isFinite(normalizedAmount) && normalizedAmount >= 0) {
                    acc[month] = normalizedAmount
                  }
                  return acc
                }, {})
              )
            }
            disabled={saveMutation.isPending}
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving...' : ui.analysis.saveForecast}
          </button>
        </div>
      </section>

      <section className={`rounded-[32px] border p-6 ${theme === 'modern' ? isDark ? 'border-white/10 bg-white/5 shadow-sm' : 'border-white/80 bg-white/80 shadow-sm' : 'border-slate-200 bg-white'}`}>
        {data.months.length === 0 ? (
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ui.analysis.noForecastRows}</p>
        ) : (
          <div className="space-y-4">
            {data.months.map((month) => (
              <div key={month.month} className={`rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-200 bg-white'}`}>
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{month.month}</p>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ui.analysis.projectedBalance}</p>
                  </div>
                  <p className={`text-lg font-bold tabular-nums ${month.projectedBalance >= 0 ? (isDark ? 'text-white' : 'text-slate-900') : 'text-rose-600'}`}>
                    {month.projectedBalance.toLocaleString()} {baseCurrency}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400">{ui.analysis.expectedIncome}</p>
                    <p className="mt-2 text-sm font-bold text-emerald-600">{month.expectedIncome.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400">{ui.analysis.recurringIncome}</p>
                    <p className="mt-2 text-sm font-bold text-emerald-600">{month.recurringIncome.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400">{ui.analysis.recurringExpense}</p>
                    <p className="mt-2 text-sm font-bold text-rose-600">{month.recurringExpense.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400">{ui.analysis.cardPayments}</p>
                    <p className="mt-2 text-sm font-bold text-rose-600">{month.cardPayments.toLocaleString()}</p>
                  </div>
                  <div className={`rounded-2xl px-4 py-3 ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <p className="text-xs text-slate-400">{ui.analysis.netCashflow}</p>
                    <p className={`mt-2 text-sm font-bold ${month.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {month.net >= 0 ? '+' : ''}{month.net.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
