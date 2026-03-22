'use client'

import React, { useMemo } from 'react'
import { Link, usePathname, useRouter } from '@/navigation'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, Layers3 } from 'lucide-react'
import { useAnalysisSummary } from '@/hooks/useAnalysisSummary'
import { useCategories } from '@/hooks/useCategories'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'
import AppLoadingState from '@/components/AppLoadingState'

export default function AnalysisCategoryPage() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const month = searchParams.get('month') || ''
  const { theme } = useUiTheme()
  const { colorMode } = useColorMode()
  const { data, isLoading, isError } = useAnalysisSummary()
  const { data: categories = [] } = useCategories()
  const isDark = colorMode === 'dark'

  const categoryNameMap = useMemo(
    () => new Map(categories.map((category) => [category.key, category.name])),
    [categories]
  )

  if (isLoading) {
    return <AppLoadingState label="카테고리 분석" />
  }

  if (isError || !data) {
    return (
      <div className={`rounded-[28px] p-6 ${isDark ? 'border border-rose-400/20 bg-rose-500/10 text-rose-200' : 'border border-rose-200 bg-rose-50 text-rose-700'}`}>
        카테고리 분석 데이터를 불러오지 못했습니다.
      </div>
    )
  }

  const availableMonths = data.monthlyCategoryBreakdown.map((item) => item.month)
  const activeMonth = month || availableMonths[availableMonths.length - 1] || ''
  const breakdown = data.monthlyCategoryBreakdown.find((item) => item.month === activeMonth)
  const rows = (breakdown?.categories ?? []).map((category) => ({
    ...category,
    name: categoryNameMap.get(category.key) ?? category.name,
  }))
  const total = rows.reduce((sum, row) => sum + row.amount, 0)

  return (
    <div className="space-y-6">
      <div className={`rounded-[32px] p-6 ${theme === 'modern' ? isDark ? 'border border-white/10 bg-white/5 shadow-sm' : 'border border-white/80 bg-white/80 shadow-sm' : 'border border-slate-200 bg-white'}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>
              <Layers3 className="h-6 w-6" />
            </div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>전체 카테고리 지출</h1>
            <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{activeMonth} 기준 모든 지출 카테고리를 확인할 수 있습니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={activeMonth}
              onChange={(event) => {
                const params = new URLSearchParams(searchParams.toString())
                params.set('month', event.target.value)
                router.replace(`${pathname}?${params.toString()}`)
              }}
              className={`rounded-2xl border px-4 py-3 text-sm font-medium ${isDark ? 'border-white/10 bg-white/5 text-white' : 'border-slate-200 bg-slate-50 text-slate-900'}`}
            >
              {availableMonths.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <Link
              href="/analysis"
              className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold ${isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
            >
              <ChevronLeft className="h-4 w-4" />
              분석으로 돌아가기
            </Link>
          </div>
        </div>
      </div>

      <div className={`rounded-[32px] p-6 ${theme === 'modern' ? isDark ? 'border border-white/10 bg-white/5 shadow-sm' : 'border border-white/80 bg-white/80 shadow-sm' : 'border border-slate-200 bg-white'}`}>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>카테고리별 금액</h2>
            <p className={`mt-1 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>총 지출 {Math.round(total).toLocaleString()} {data.baseCurrency}</p>
          </div>
        </div>

        <div className="space-y-4">
          {rows.length === 0 ? (
            <div className={`rounded-2xl p-4 text-sm ${isDark ? 'border border-white/10 bg-white/5 text-slate-400' : 'border border-slate-200 bg-slate-50 text-slate-500'}`}>
              선택한 달의 지출 카테고리가 아직 없습니다.
            </div>
          ) : null}
          {rows.map((row) => {
            const share = total > 0 ? Math.round((row.amount / total) * 100) : 0
            const maxAmount = rows[0]?.amount ?? 1

            return (
              <div key={row.key} className={`rounded-2xl p-4 ${isDark ? 'border border-white/10 bg-white/5' : 'border border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{row.name}</p>
                    <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{share}%</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{Math.round(row.amount).toLocaleString()} {data.baseCurrency}</p>
                  </div>
                </div>
                <div className={`mt-3 h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${(row.amount / maxAmount) * 100}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
