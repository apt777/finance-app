'use client'

import React, { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@/navigation'
import { useHoldings } from '../hooks/useHoldings'
import { useAccounts } from '../hooks/useAccounts'
import { useExchangeRates, ExchangeRate } from '../hooks/useExchangeRates'
import { TrendingUp, Filter, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useUiTheme } from '@/context/UiThemeContext'
import AppLoadingState from '@/components/AppLoadingState'
import { getUiCopy } from '@/lib/uiCopy'

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
  name?: string | null;
  shares: number;
  costBasis: number;
  currency: string;
  marketPrice?: number | null;
}

// ExchangeRate interface is imported from useExchangeRates hook

const HoldingsList = () => {
  const { theme } = useUiTheme()
  const tHoldings = useTranslations('holdings')
  const tCommon = useTranslations('common')
  const tTransactions = useTranslations('transactions')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const queryClient = useQueryClient()
  
  const { data: holdingsData, error: holdingsError, isLoading: holdingsLoading } = useHoldings()
  const { data: accountsData, error: accountsError, isLoading: accountsLoading } = useAccounts()
  const { data: exchangeRatesData, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  const [filterAccount, setFilterAccount] = useState('')
  const [deletingHoldingId, setDeletingHoldingId] = useState<string | null>(null)
  const [deleteElapsedSeconds, setDeleteElapsedSeconds] = useState(0)

  const deleteHoldingMutation = useMutation({
    mutationFn: async (holdingId: string) => {
      const response = await fetch('/api/holdings', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: holdingId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || ui.investmentPortfolio.deleteFailed)
      }

      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
    },
  })

  if (holdingsLoading || accountsLoading || ratesLoading) {
    return <AppLoadingState label={tHoldings('title')} />
  }

  if (holdingsError || accountsError || ratesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{tCommon('error')}</p>
      </div>
    )
  }

  const holdings: Holding[] = (holdingsData as unknown as Holding[]) || []
  const accounts: Account[] = (accountsData as unknown as Account[]) || []
  const exchangeRates: ExchangeRate[] = exchangeRatesData || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = exchangeRates.find((r) => r.fromCurrency === currency && r.toCurrency === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  const accountMap = new Map<string, string>(accounts.map((account: Account) => [account.id, account.name]))

  const filteredHoldings = holdings.filter((holding: Holding) => {
    return filterAccount === '' || holding.accountId === filterAccount
  })

  const handleDeleteHolding = async (holdingId: string) => {
    if (!window.confirm(ui.investmentPortfolio.deleteConfirm)) {
      return
    }

    try {
      setDeletingHoldingId(holdingId)
      setDeleteElapsedSeconds(0)
      await deleteHoldingMutation.mutateAsync(holdingId)
    } catch (error) {
      alert(error instanceof Error ? error.message : ui.investmentPortfolio.deleteFailed)
    } finally {
      setDeletingHoldingId(null)
      setDeleteElapsedSeconds(0)
    }
  }

  useEffect(() => {
    if (!deletingHoldingId) {
      return
    }

    const timer = window.setInterval(() => {
      setDeleteElapsedSeconds((prev) => prev + 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [deletingHoldingId])

  const totalValue = filteredHoldings.reduce((sum, holding) => {
    const unitPrice = holding.marketPrice || holding.costBasis
    return sum + convertToBaseCurrency(holding.shares * unitPrice, holding.currency)
  }, 0)

  return (
    <div className={`space-y-6 ${theme === 'modern' ? 'rounded-[34px] border border-white/80 bg-white/55 p-4 shadow-[0_18px_50px_rgba(148,163,184,0.12)] backdrop-blur-xl md:p-6' : ''}`}>
      {/* Filter Card */}
      <div className={`rounded-2xl p-6 ${theme === 'modern' ? 'border border-white/80 bg-white shadow-[0_10px_30px_rgba(148,163,184,0.14)]' : 'border border-slate-100 bg-white shadow-sm'}`}>
        <div className="flex items-center space-x-3 mb-4">
          <Filter className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">{tTransactions('filterBy')}</h3>
        </div>
        <select
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
        >
          <option value="">{tAccounts('allAccounts')}</option>
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
          <div className={`rounded-2xl p-8 text-white ${theme === 'modern' ? 'bg-slate-950 shadow-[0_18px_40px_rgba(15,23,42,0.22)]' : 'bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">{tHoldings('totalValue')}</p>
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
              const unitPrice = holding.marketPrice || holding.costBasis
              const value = convertToBaseCurrency(holding.shares * unitPrice, holding.currency)
              const accountName = accountMap.get(holding.accountId) || holding.currency

              const isDeleting = deletingHoldingId === holding.id

              return (
                <div
                  key={holding.id}
                  className={`overflow-hidden rounded-2xl border transition-all duration-200 ${theme === 'modern' ? 'border-white/80 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.14)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(148,163,184,0.18)]' : 'border-slate-100 bg-white shadow-sm hover:shadow-xl'}`}
                >
                  {/* Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">{holding.symbol}</h3>
                        <p className="text-sm text-slate-600 mt-1">{holding.name || accountName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDeleteHolding(holding.id)}
                          disabled={deleteHoldingMutation.isPending}
                          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white px-2 text-rose-500 transition-colors hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={ui.investmentPortfolio.deleteAction}
                          title={ui.investmentPortfolio.deleteAction}
                        >
                          <Trash2 className="h-4 w-4" />
                          {isDeleting ? (
                            <span className="text-[11px] font-semibold">
                              {ui.investmentPortfolio.deleteAction} ({deleteElapsedSeconds}s)
                            </span>
                          ) : null}
                        </button>
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-blue-600" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6 space-y-4">
                    {/* Shares */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <p className="text-xs text-slate-600 mb-1">{tHoldings('shares')}</p>
                      <p className="text-2xl font-bold text-slate-800">
                        {holding.shares.toLocaleString()}
                      </p>
                    </div>

                    {/* Cost Basis */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-600 mb-1">{tHoldings('costBasis')}</p>
                        <p className="text-sm font-bold text-slate-800">
                          {holding.costBasis.toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{holding.currency}</p>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4">
                        <p className="text-xs text-slate-600 mb-1">{holding.marketPrice ? tHoldings('currentPrice') : 'Total Cost'}</p>
                        <p className="text-sm font-bold text-slate-800">
                          {holding.marketPrice ? holding.marketPrice.toFixed(2) : (holding.shares * holding.costBasis).toFixed(2)}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">{holding.currency}</p>
                      </div>
                    </div>

                    {/* Total Value */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
                      <p className="text-xs text-slate-600 mb-1">{tHoldings('totalValue')} ({BASE_CURRENCY})</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round(value).toLocaleString()}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/holdings/add?mode=buy&holdingId=${holding.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {ui.holdingsForm.buyTitle}
                      </Link>
                      <Link
                        href={`/holdings/add?mode=sell&holdingId=${holding.id}`}
                        className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                      >
                        {ui.holdingsForm.sellTitle}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        <div className={`rounded-2xl p-12 text-center ${theme === 'modern' ? 'border border-white/80 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.14)]' : 'border border-slate-100 bg-white shadow-sm'}`}>
          <TrendingUp className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">{tHoldings('noHoldings')}</p>
          <p className="text-slate-500 text-sm mt-1">{ui.investmentPortfolio.holdingsCta}</p>
        </div>
      )}
    </div>
  )
}

export default HoldingsList
