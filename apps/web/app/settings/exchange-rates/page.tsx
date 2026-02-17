'use client'

import React from 'react'
import ExchangeRateManager from '@/components/ExchangeRateManager'

export default function ExchangeRateManagementPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <ExchangeRateManager />
      </div>
    </div>
  )
}