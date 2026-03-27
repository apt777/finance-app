'use client'

import React, { useState, useEffect } from 'react'
import { useExchangeRates } from '@/hooks/useExchangeRates'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  TrendingUp, 
  RefreshCw, 
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  ArrowRightLeft 
} from 'lucide-react'
import { 
  SUPPORTED_CURRENCIES, 
  getReverseRate 
} from '@/lib/currency'
import { useLocale, useTranslations } from 'next-intl'
import AppLoadingState from '@/components/AppLoadingState'
import { useTrackedCurrencies } from '@/hooks/useTrackedCurrencies'

// Interface matching Prisma schema field names
interface ExchangeRate {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: number
  updatedAt?: string
}

// Interface for API request (uses 'from' and 'to')
interface ExchangeRateRequest {
  from: string
  to: string
  rate: number
}

const DISPLAY_PRIORITY: Record<string, number> = {
  USD: 6,
  EUR: 5,
  GBP: 4,
  CNY: 3,
  JPY: 2,
  KRW: 1,
}

function getReadableQuote(rate: number) {
  if (rate >= 1) {
    return {
      multiplier: 1,
      converted: rate,
      maximumFractionDigits: rate >= 100 ? 2 : rate >= 1 ? 4 : 6,
    }
  }

  const multipliers = [1, 10, 100, 1000, 10000, 100000, 1000000]
  const multiplier = multipliers.find((value) => rate * value >= 0.1 && rate * value < 1000) ?? 1000000
  const converted = rate * multiplier

  return {
    multiplier,
    converted,
    maximumFractionDigits: converted >= 100 ? 2 : converted >= 1 ? 4 : 6,
  }
}

function getDisplayRate(rate: ExchangeRate) {
  const fromPriority = DISPLAY_PRIORITY[rate.fromCurrency] ?? 0
  const toPriority = DISPLAY_PRIORITY[rate.toCurrency] ?? 0
  const shouldSwap = toPriority > fromPriority && rate.rate !== 0
  const displayFromCurrency = shouldSwap ? rate.toCurrency : rate.fromCurrency
  const displayToCurrency = shouldSwap ? rate.fromCurrency : rate.toCurrency
  const effectiveRate = shouldSwap ? 1 / rate.rate : rate.rate
  const quote = getReadableQuote(effectiveRate)

  return {
    displayFromCurrency,
    displayToCurrency,
    effectiveRate,
    quote,
  }
}

const ExchangeRateManager = () => {
  const locale = useLocale()
  const tSettings = useTranslations('settings')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useExchangeRates()
  const { trackedCurrencies, updateTrackedCurrencies, isSaving } = useTrackedCurrencies()
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    from: 'JPY',
    to: 'KRW',
    rate: '',
  })

  // Update exchange rate mutation
  const updateRateMutation = useMutation<any, Error, ExchangeRateRequest>({
    mutationFn: async (rateData: ExchangeRateRequest) => {
      const res = await fetch('/api/exchange-rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(rateData),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || tCommon('error'))
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] })
      setShowForm(false)
      setEditingId(null)
      setFormData({ from: 'JPY', to: 'KRW', rate: '' })
    },
  })

  // Delete exchange rate mutation
  const deleteRateMutation = useMutation<any, Error, string>({
    mutationFn: async (rateId: string) => {
      const res = await fetch(`/api/exchange-rates/${rateId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || tCommon('error'))
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.from || !formData.to || !formData.rate) {
      alert(tCommon('error'))
      return
    }

    if (formData.from === formData.to) {
      alert(tSettings('swap'))
      return
    }

    updateRateMutation.mutate({
      from: formData.from,
      to: formData.to,
      rate: parseFloat(formData.rate),
    })
  }

  const handleSwapCurrencies = () => {
    setFormData({
      from: formData.to,
      to: formData.from,
      rate: formData.rate ? (getReverseRate(parseFloat(formData.rate))).toFixed(6) : '',
    })
  }

  const handleDelete = (rateId: string) => {
    if (confirm(`${tCommon('delete')}?`)) {
      deleteRateMutation.mutate(rateId)
    }
  }

  const handleToggleTrackedCurrency = async (currency: string) => {
    const next = trackedCurrencies.includes(currency)
      ? trackedCurrencies.filter((item) => item !== currency)
      : [...trackedCurrencies, currency]

    if (next.length < 2) {
      return
    }

    try {
      setPendingCurrency(currency)
      await updateTrackedCurrencies(next)
    } finally {
      setPendingCurrency(null)
    }
  }

  if (isLoading) {
    return <AppLoadingState label={tSettings('exchangeRates')} />
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{tCommon('error')}</p>
      </div>
    )
  }

  const exchangeRates: ExchangeRate[] = (data as ExchangeRate[]) || []
  const visibleRates = exchangeRates
    .filter((rate) => trackedCurrencies.includes(rate.fromCurrency) && trackedCurrencies.includes(rate.toCurrency))
    .reduce<ExchangeRate[]>((list, current) => {
      const existingIndex = list.findIndex((item) => {
        return (
          (item.fromCurrency === current.fromCurrency && item.toCurrency === current.toCurrency) ||
          (item.fromCurrency === current.toCurrency && item.toCurrency === current.fromCurrency)
        )
      })

      if (existingIndex === -1) {
        list.push(current)
        return list
      }

      const existing = list[existingIndex]
      if (!existing) {
        return list
      }

      const currentScore = current.rate >= 0.1 && current.rate < 1000 ? 1 : 0
      const existingScore = existing.rate >= 0.1 && existing.rate < 1000 ? 1 : 0

      if (currentScore > existingScore) {
        list[existingIndex] = current
      }

      return list
    }, [])
    .sort((left, right) => {
      const leftFromIndex = trackedCurrencies.indexOf(left.fromCurrency)
      const rightFromIndex = trackedCurrencies.indexOf(right.fromCurrency)
      const leftToIndex = trackedCurrencies.indexOf(left.toCurrency)
      const rightToIndex = trackedCurrencies.indexOf(right.toCurrency)

      return (
        leftFromIndex - rightFromIndex ||
        leftToIndex - rightToIndex ||
        left.fromCurrency.localeCompare(right.fromCurrency) ||
        left.toCurrency.localeCompare(right.toCurrency)
      )
    })

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tSettings('exchangeRates')}</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{tSettings('exchangeRates')}</h2>
              <p className="mt-2 text-sm text-slate-500">{tSettings('exchangeRateDesc')}</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center justify-center space-x-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-md transition-all hover:bg-slate-800"
          >
            <Plus className="w-5 h-5" />
            <span>{tSettings('addRate')}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800">{tSettings('currencies')}</h3>
        <p className="text-slate-600 text-sm mt-1">{tSettings('trackedCurrenciesDesc')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {SUPPORTED_CURRENCIES.map((currency) => {
            const isActive = trackedCurrencies.includes(currency)

            return (
              <button
                key={currency}
                type="button"
                onClick={() => handleToggleTrackedCurrency(currency)}
                disabled={isSaving}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  isActive
                    ? 'border-slate-900 bg-slate-950 text-white'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  {pendingCurrency === currency ? (
                    <span className="h-3.5 w-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : null}
                  {currency}
                </span>
              </button>
            )
          })}
        </div>
        {pendingCurrency ? (
          <p className="mt-3 text-xs text-slate-500">{tCommon('loading')}</p>
        ) : null}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{tSettings('rateSettings')}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* From Currency */}
              <div>
                <label htmlFor="from" className="block text-sm font-medium text-slate-700 mb-2">
                  {tSettings('from')} {tSettings('currencies')}
                </label>
                <select
                  id="from"
                  value={formData.from}
                  onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 appearance-none pr-8"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>

              {/* Swap Button */}
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={handleSwapCurrencies}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  title={tSettings('swap')}
                >
                  <ArrowRightLeft className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* To Currency */}
              <div>
                <label htmlFor="to" className="block text-sm font-medium text-slate-700 mb-2">
                  {tSettings('to')} {tSettings('currencies')}
                </label>
                <select
                  id="to"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 appearance-none pr-8"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate Input */}
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-slate-700 mb-2">
                {tSettings('rate')} (1 {formData.from} = ? {formData.to})
              </label>
              <input
                id="rate"
                type="number"
                min="0"
                onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                step="0.0001"
                value={formData.rate}
                onChange={(e) => setFormData({ ...formData, rate: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 placeholder-slate-400"
                placeholder={tSettings('rateExample', { from: formData.from, to: formData.to })}
                required
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={updateRateMutation.isPending}
                className="flex-1 px-4 py-2 bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {updateRateMutation.isPending ? tCommon('loading') : tCommon('save')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setEditingId(null)
                  setFormData({ from: 'JPY', to: 'KRW', rate: '' })
                }}
                className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
              >
                {tCommon('cancel')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exchange Rates List */}
      {visibleRates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleRates.map((rate) => {
            const { displayFromCurrency, displayToCurrency, quote } = getDisplayRate(rate)
            const formattedQuote = quote.converted.toLocaleString(
              locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US',
              {
                minimumFractionDigits: 0,
                maximumFractionDigits: quote.maximumFractionDigits,
              }
            )

            return (
              <div
                key={rate.id}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-200 card-hover"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-800">
                      {displayFromCurrency} → {displayToCurrency}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setEditingId(rate.id)
                        setFormData({
                          from: rate.fromCurrency,
                          to: rate.toCurrency,
                          rate: rate.rate.toString(),
                        })
                        setShowForm(true)
                      }}
                      className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                      title={tCommon('edit')}
                    >
                      <Edit2 className="w-4 h-4 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(rate.id)}
                      className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                      title={tCommon('delete')}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 mb-4">
                  <p className="text-sm text-slate-600 mb-1">{tSettings('currentRate')}</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {formattedQuote}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {quote.multiplier.toLocaleString()} {displayFromCurrency} = {formattedQuote} {displayToCurrency}
                  </p>
                </div>

                {rate.updatedAt && (
                  <div className="flex items-center space-x-2 text-xs text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>
                      {tSettings('lastUpdated')}: {new Date(rate.updatedAt).toLocaleDateString(locale === 'ko' ? 'ko-KR' : locale === 'ja' ? 'ja-JP' : locale === 'zh' ? 'zh-CN' : 'en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                        hour12: false
                      })}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-4">{tSettings('noRates')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-950 hover:bg-slate-800 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>{tSettings('addFirstRate')}</span>
          </button>
        </div>
      )}

      {/* Error Messages */}
      {updateRateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          <p className="font-medium">{tCommon('error')}</p>
          <p className="text-xs mt-1">{updateRateMutation.error.message}</p>
        </div>
      )}

      {deleteRateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          <p className="font-medium">{tCommon('error')}</p>
          <p className="text-xs mt-1">{deleteRateMutation.error.message}</p>
        </div>
      )}
    </div>
  )
}

export default ExchangeRateManager
