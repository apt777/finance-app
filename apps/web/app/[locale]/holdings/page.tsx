'use client'

import React from 'react'
import { Briefcase, Plus } from 'lucide-react'
import HoldingsList from '@/components/HoldingsList'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { useUiTheme } from '@/context/UiThemeContext'

export default function HoldingsPage() {
  const t = useTranslations('holdings')
  const { theme } = useUiTheme()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${theme === 'modern' ? 'bg-slate-950' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-800">{t('title')}</h1>
            <p className="text-slate-600 text-sm mt-1">Manage your investment portfolio</p>
          </div>
        </div>
        <Link
          href="/holdings/add"
          className={`flex items-center space-x-2 rounded-xl px-4 py-2 font-semibold text-white transition-all duration-200 ${theme === 'modern' ? 'bg-slate-950 shadow-lg hover:bg-slate-800' : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700'}`}
        >
          <Plus className="w-5 h-5" />
          <span>{t('addHolding')}</span>
        </Link>
      </div>

      {/* Holdings List */}
      <HoldingsList />
    </div>
  )
}
