'use client'

import React from 'react'
import { Target, Plus } from 'lucide-react'
import GoalList from '@/components/GoalList'
import { Link } from '@/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'
import { getUiCopy } from '@/lib/uiCopy'

export default function GoalsPage() {
  const t = useTranslations('goals')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const { theme } = useUiTheme()
  const { colorMode } = useColorMode()
  const isDark = colorMode === 'dark'
  const modernSubtitle = t('pageDesc')

  if (theme === 'modern') {
    return (
      <div className="space-y-6 pb-10 md:pb-12">
        <section className={`rounded-[32px] p-6 ${isDark ? 'border border-white/10 bg-white/5 shadow-[0_18px_50px_rgba(0,0,0,0.24)] backdrop-blur-xl' : 'border border-white/80 bg-white/70 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl'}`}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start space-x-4 md:items-center">
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isDark ? 'bg-white/8 text-white' : 'bg-slate-950 text-white'}`}>
                <Target className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold uppercase tracking-[0.24em] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{ui.goals.workspaceLabel}</p>
                <h1 className={`mt-2 text-3xl font-black tracking-[-0.04em] ${isDark ? 'text-white' : 'text-slate-950'}`}>{t('title')}</h1>
                <p className={`mt-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {modernSubtitle}
                </p>
              </div>
            </div>
            <Link
              href="/goals/add"
              className={`inline-flex self-start items-center justify-center space-x-2 rounded-2xl px-5 py-3 font-semibold transition-all md:self-auto ${isDark ? 'border border-white/10 bg-white/5 text-white hover:bg-white/10' : 'bg-slate-950 text-white shadow-md hover:bg-slate-800'}`}
            >
              <Plus className="h-5 w-5" />
              <span>{t('addGoal')}</span>
            </Link>
          </div>
        </section>

        <GoalList />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10 md:pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-800">{t('title')}</h1>
            <p className="text-slate-600 text-sm mt-1">{t('pageDesc')}</p>
          </div>
        </div>
        <Link
          href="/goals/add"
          className="flex items-center space-x-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 font-semibold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          <span>{t('addGoal')}</span>
        </Link>
      </div>

      {/* Goals List */}
      <GoalList />
    </div>
  )
}
