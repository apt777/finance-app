'use client'

import React from 'react'
import { Briefcase, Plus } from 'lucide-react'
import HoldingsList from '@/components/HoldingsList'
import { Link } from '@/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useUiTheme } from '@/context/UiThemeContext'
import { getUiCopy } from '@/lib/uiCopy'

export default function HoldingsPage() {
  const t = useTranslations('holdings')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const { theme } = useUiTheme()
  const holdingsSubtitle =
    locale === 'en'
      ? 'Track positions, average price, and account-linked investment activity in one place.'
      : locale === 'ja'
        ? '保有銘柄、平均取得単価、口座に連動した投資の動きを一か所で確認できます。'
        : locale === 'zh'
          ? '在一个页面里查看持仓、平均成本和与账户关联的投资活动。'
          : '보유 종목, 평단가, 계좌와 연결된 투자 흐름을 한 곳에서 확인할 수 있습니다.'

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${theme === 'modern' ? 'bg-slate-950' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{t('title')}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{t('title')}</h1>
              <p className="mt-2 text-sm text-slate-500">{holdingsSubtitle}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Link
              href="/holdings/add?mode=buy"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
            >
              {ui.holdingsForm.buyTitle}
            </Link>
            <Link
              href="/holdings/add?mode=sell"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:bg-slate-50"
            >
              {ui.holdingsForm.sellTitle}
            </Link>
            <Link
              href="/holdings/add"
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 ${theme === 'modern' ? 'bg-slate-950 shadow-md hover:bg-slate-800' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700'}`}
            >
              <Plus className="w-5 h-5" />
              <span>{t('addHolding')}</span>
            </Link>
          </div>
        </div>
      </div>

      <HoldingsList />
    </div>
  )
}
