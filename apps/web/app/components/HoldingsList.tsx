'use client'

import React, { useState } from 'react'
import { useHoldings } from '../hooks/useHoldings'
import { useAccounts } from '../hooks/useAccounts'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { TrendingUp, TrendingDown, Filter } from 'lucide-react'

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

const HoldingsList = () => {
  const { data: holdingsData, error: holdingsError, isLoading: holdingsLoading } = useHoldings()
  const { data: accountsData, error: accountsError, isLoading: accountsLoading } = useAccounts()
  const { data: exchangeRatesData, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  const [filterAccount, setFilterAccount] = useState('')

  if (holdingsLoading || accountsLoading || ratesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">보유 자산 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (holdingsError || accountsError || ratesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">보유 자산 정보를 불러오는 중 오류 발생</p>
      </div>
    )
  }

  const holdings: Holding[] = (holdingsData as Holding[]) || []
  const accounts: Account[] = (accountsData as Account[]) || []
  const exchangeRates: ExchangeRate[] = (exchangeRatesData as ExchangeRate[]) || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = exchangeRates.find((r) => r.from === currency && r.to === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  const accountMap = new Map<string, string>(accounts.map((account: Account) => [account.id, account.name]))

  const filteredHoldings = holdings.filter((holding: Holding) => {
    return filterAccount === '' || holding.accountId === filterAccount
  })

  const totalValue = filteredHoldings.reduce((sum, holding) => {
    return sum + convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Filter Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">필터</h3>
        </div>
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
        >
          <option value="">모든 계좌</option>
          {accounts.map((account: Account) => (
            <option key={account.id} value={account.id}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>
      </div>

      {filteredHoldings.length > 0 ? (
        <>
          {/* Summary Card */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl p-8 shadow-lg text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">총 보유 자산</p>
                <h2 className="text-4xl font-bold mt-2">
                  {Math.round(totalValue).toLocaleString()}
                </h2>
                <p className="text-blue-100 text-sm mt-1">{BASE_CURRENCY}</p>
              </div>
              <TrendingUp className="w-16 h-16 opacity-20" />
            </div>
          </div>

          {/* Holdings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHoldings.map((holding: Holding) => {
              const value = convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
              const accountName = accountMap.get(holding.accountId) || 'Unknown'

              return (
                <div
                  key={holding.id}
                  className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 overflow-hidden"
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">{holding.symbol}</h3>
                        <p className="text-sm text-slate-600 mt-1">{accountName}</p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Shares */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-600 mb-1">보유 주수</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {holding.shares.toLocaleString()}
                      </p>
                    </div>

                    {/* Cost Basis */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-600 mb-1">매입가</p>
                        <p className="text-sm font-bold text-slate-800">
                          {holding.costBasis.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{holding.currency}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-600 mb-1">총 매입액</p>
                        <p className="text-sm font-bold text-slate-800">
                          {(holding.shares * holding.costBasis).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{holding.currency}</p>
                      </div>
                    </div>

                    {/* Total Value */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-xs text-slate-600 mb-1">총 가치 ({BASE_CURRENCY})</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round(value).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">보유 자산이 없습니다.</p>
          <p className="text-slate-500 text-sm mt-1">새로운 투자를 추가하여 포트폴리오를 시작하세요!</p>
        </div>
      )}
    </div>
  )
}

export default HoldingsList
