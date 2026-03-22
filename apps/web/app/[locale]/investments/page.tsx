'use client'

import React, { useState } from 'react'
import { TrendingUp, Plus } from 'lucide-react'
import InvestmentPortfolio from '@/components/InvestmentPortfolio'
import { Link } from '@/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'

export default function InvestmentsPage() {
  const locale = useLocale()
  const tHoldings = useTranslations('holdings')
  const ui = getUiCopy(locale)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{tHoldings('title')}</h1>
            <p className="text-slate-600 text-sm mt-1">{ui.investmentPortfolio.nisaLimit}</p>
          </div>
        </div>
        <Link
          href="/investments/add"
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>{tHoldings('addHolding')}</span>
        </Link>
      </div>

      {/* Portfolio */}
      <InvestmentPortfolio />
    </div>
  )
}
