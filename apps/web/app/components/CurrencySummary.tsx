'use client'

import React, { useMemo } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { useExchangeRates, ExchangeRate } from '@/hooks/useExchangeRates'
import { getCurrencySymbol, getCurrencyName, convertToBaseCurrency } from '@/lib/currency'
import { Wallet, TrendingUp, PieChart } from 'lucide-react'

interface CurrencyBalance {
  currency: string
  balance: number
  accounts: number
}

const CurrencySummary = ({ baseCurrency = 'JPY' }: { baseCurrency?: string }) => {
  const { data: accounts, isLoading: accountsLoading } = useAccounts()
  const { data: exchangeRates, isLoading: ratesLoading } = useExchangeRates()

  const summary = useMemo(() => {
    const emptySummary = {
      byCurrency: {} as { [key: string]: CurrencyBalance },
      totalInBaseCurrency: 0,
      currencyBreakdown: [] as (CurrencyBalance & { percentage: number })[],
    };

    if (!accounts || !exchangeRates) {
      return emptySummary;
    }

    const accountsList = Array.isArray(accounts) ? accounts : []
    const ratesList = Array.isArray(exchangeRates) ? exchangeRates : []

    if (accountsList.length === 0) {
      return emptySummary;
    }

    // Group by currency
    const byCurrency: { [key: string]: CurrencyBalance } = {}

    accountsList.forEach((account: any) => {
      const currency = account.currency || 'KRW'
      if (!byCurrency[currency]) {
        byCurrency[currency] = {
          currency,
          balance: 0,
          accounts: 0,
        }
      }
      byCurrency[currency].balance += account.balance || 0
      byCurrency[currency].accounts += 1
    })

    // Convert to base currency
    const totalInBaseCurrency = Object.values(byCurrency).reduce((sum, item) => {
        const amounts: any = { [item.currency]: item.balance };
        return sum + convertToBaseCurrency(amounts, baseCurrency as any, ratesList as any)
    }, 0);

    // Calculate breakdown percentages
    const currencyBreakdown = Object.values(byCurrency).map((item: CurrencyBalance) => {
        const amounts: any = { [item.currency]: item.balance };
        const valueInBase = convertToBaseCurrency(amounts, baseCurrency as any, ratesList as any);
        return {
          ...item,
          percentage: totalInBaseCurrency > 0 ? (valueInBase / totalInBaseCurrency) * 100 : 0,
        }
    });

    return {
      byCurrency,
      totalInBaseCurrency,
      currencyBreakdown,
    }
  }, [accounts, exchangeRates, baseCurrency])

  if (accountsLoading || ratesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">자산 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Total Assets in Base Currency */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-lg text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-blue-100 text-sm">총자산 ({baseCurrency})</p>
            <h2 className="text-4xl font-bold mt-2">
              {Math.round(summary.totalInBaseCurrency).toLocaleString()}
            </h2>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <TrendingUp className="w-8 h-8" />
          </div>
        </div>
        <p className="text-blue-100 text-sm">
          {getCurrencySymbol(baseCurrency as any)} {baseCurrency}
        </p>
      </div>

      {/* Currency Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {summary.currencyBreakdown.map((item) => (
          <div
            key={item.currency}
            className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-lg font-bold">
                  {getCurrencySymbol(item.currency as any)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">{item.currency}</h3>
                  <p className="text-xs text-slate-500">{getCurrencyName(item.currency as any)}</p>
                </div>
              </div>
              <Wallet className="w-5 h-5 text-slate-400" />
            </div>

            {/* Balance */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-600 mb-1">잔액</p>
              <p className="text-2xl font-bold text-slate-800">
                {Math.round(item.balance).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {item.currency}
              </p>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">계좌 수</span>
                <span className="font-medium text-slate-800">{item.accounts}개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">전체 비율</span>
                <span className="font-medium text-slate-800">{item.percentage.toFixed(1)}%</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${item.percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Currency Breakdown Chart */}
      {summary.currencyBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center space-x-3 mb-6">
            <PieChart className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-800">자산 구성</h3>
          </div>

          <div className="space-y-4">
            {summary.currencyBreakdown.map((item) => (
              <div key={item.currency} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{item.currency}</span>
                  <span className="text-sm text-slate-600">{item.percentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                    style={{ width: `${item.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {summary.currencyBreakdown.length === 0 && (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
          <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">계좌가 없습니다.</p>
        </div>
      )}
    </div>
  )
}

export default CurrencySummary
