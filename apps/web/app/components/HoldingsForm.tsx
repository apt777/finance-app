'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useAccounts } from '@/hooks/useAccounts'
import { useHoldings } from '@/hooks/useHoldings'
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface HoldingFormData {
  action?: 'create' | 'buy' | 'sell';
  holdingId?: string;
  accountId: string;
  symbol: string;
  name?: string;
  shares: number | string;
  costBasis: number | string;
  currency: string;
  region?: string;
}

interface SymbolSuggestion {
  symbol: string
  name: string
  region: string
  currency: string
  type: string
  matchScore: number
}

interface ExistingHoldingOption {
  id: string
  accountId: string
  symbol: string
  name?: string | null
  shares: number
  costBasis: number
  currency: string
  region?: string | null
}

const createHolding = async (holdingData: HoldingFormData) => {
  const res = await fetch('/api/holdings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...holdingData,
      action: holdingData.action || 'create',
      holdingId: holdingData.holdingId || undefined,
      name: holdingData.name || undefined,
      shares: Number(holdingData.shares),
      costBasis: Number(holdingData.costBasis),
      region: holdingData.region || undefined,
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Error');
  }
  return res.json()
}

interface HoldingsFormProps {
  onHoldingAdded?: () => void;
}

const HoldingsForm = ({ onHoldingAdded }: HoldingsFormProps) => {
  const tHoldings = useTranslations('holdings')
  const tCommon = useTranslations('common')
  const tAccounts = useTranslations('accounts')
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useAccounts()
  const { data: holdings = [] } = useHoldings()
  const [formError, setFormError] = useState<string | null>(null)
  const [symbolQuery, setSymbolQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SymbolSuggestion[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [selectedSuggestion, setSelectedSuggestion] = useState<SymbolSuggestion | null>(null)
  const [formData, setFormData] = useState<HoldingFormData>({
    action: 'create',
    holdingId: '',
    accountId: '',
    symbol: '',
    name: '',
    shares: '',
    costBasis: '',
    currency: '',
    region: '',
  })

  useEffect(() => {
    const mode = searchParams.get('mode')

    if (mode === 'buy' || mode === 'sell') {
      setFormData((prev) => ({
        ...prev,
        action: mode,
        holdingId: '',
        symbol: '',
        name: '',
        shares: '',
        costBasis: '',
        currency: '',
        region: '',
      }))
      setSelectedSuggestion(null)
      setSuggestions([])
      setSymbolQuery('')
    }
  }, [searchParams])

  const mutation = useMutation<any, Error, HoldingFormData>({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ action: 'create', holdingId: '', accountId: '', symbol: '', name: '', shares: '', costBasis: '', currency: '', region: '' })
      setSymbolQuery('')
      setSuggestions([])
      setSelectedSuggestion(null)
      setFormError(null)
      onHoldingAdded?.();
    },
  })

  const currencies = [
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'KRW', label: 'KRW (₩)' },
    { value: 'USD', label: 'USD ($)' },
  ]

  const existingHoldings = (holdings as ExistingHoldingOption[]).filter((holding) => {
    if (!formData.accountId) {
      return true
    }

    return holding.accountId === formData.accountId
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null)

    if (name === 'accountId') {
      setFormData({
        ...formData,
        accountId: value,
      });
    } else if (name === 'action') {
      setSelectedSuggestion(null)
      setSuggestions([])
      setSymbolQuery('')
      setFormData({
        action: value as 'create' | 'buy' | 'sell',
        holdingId: '',
        accountId: formData.accountId,
        symbol: '',
        name: '',
        shares: '',
        costBasis: '',
        currency: '',
        region: '',
      })
    } else if (name === 'holdingId') {
      const selectedHolding = existingHoldings.find((holding) => holding.id === value)
      setSelectedSuggestion(null)
      setSuggestions([])
      setSymbolQuery(selectedHolding?.symbol || '')
      setFormData({
        ...formData,
        holdingId: value,
        symbol: selectedHolding?.symbol || '',
        name: selectedHolding?.name || '',
        currency: selectedHolding?.currency || '',
        region: selectedHolding?.region || '',
        accountId: selectedHolding?.accountId || formData.accountId,
      })
    } else if (name === 'symbol') {
      setSymbolQuery(value)
      setSelectedSuggestion(null)
      setFormData({
        ...formData,
        symbol: value.toUpperCase(),
        name: '',
        region: '',
      })
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }

  useEffect(() => {
    if (formData.action !== 'create') {
      setSuggestions([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    const trimmed = symbolQuery.trim()

    if (trimmed.length < 2 || selectedSuggestion?.symbol === trimmed.toUpperCase()) {
      setSuggestions([])
      setSearchError(null)
      setSearchLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        setSearchLoading(true)
        setSearchError(null)
        const response = await fetch(`/api/holdings/search?keywords=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to search symbols')
        }

        setSuggestions(result)
      } catch (error) {
        if (controller.signal.aborted) {
          return
        }

        setSuggestions([])
        setSearchError(error instanceof Error ? error.message : 'Failed to search symbols')
      } finally {
        if (!controller.signal.aborted) {
          setSearchLoading(false)
        }
      }
    }, 350)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [formData.action, selectedSuggestion?.symbol, symbolQuery])

  const chooseSuggestion = (suggestion: SymbolSuggestion) => {
    setSelectedSuggestion(suggestion)
    setSuggestions([])
    setSearchError(null)
    setSymbolQuery(suggestion.symbol)
    setFormData((prev) => ({
      ...prev,
      symbol: suggestion.symbol.toUpperCase(),
      name: suggestion.name,
      currency: suggestion.currency || prev.currency,
      region: suggestion.region || prev.region,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.accountId || !formData.symbol || !formData.shares || !formData.costBasis || !formData.currency) {
      setFormError('Please fill in all required fields.')
      return
    }

    if ((formData.action === 'buy' || formData.action === 'sell') && !formData.holdingId) {
      setFormError('추가 매수 또는 매도할 투자 종목을 선택해 주세요.')
      return
    }

    if (formData.action === 'create' && !selectedSuggestion) {
      setFormError('검색 결과에서 종목을 선택해 주세요.')
      return
    }

    if (isNaN(Number(formData.shares)) || isNaN(Number(formData.costBasis))) {
      setFormError('Shares and cost basis must be numbers.')
      return;
    }

    if (Number(formData.shares) <= 0 || Number(formData.costBasis) <= 0) {
      setFormError('Shares and cost basis must be greater than 0.')
      return;
    }

    mutation.mutate(formData)
  }

  const totalCost = formData.shares && formData.costBasis
    ? Number(formData.shares) * Number(formData.costBasis)
    : 0
  const selectedHolding = existingHoldings.find((holding) => holding.id === formData.holdingId)
  const canSubmit = useMemo(
    () => Boolean(
      formData.accountId &&
      formData.symbol &&
      formData.shares &&
      formData.costBasis &&
      formData.currency &&
      (formData.action === 'create' ? selectedSuggestion : formData.holdingId)
    ),
    [formData.accountId, formData.action, formData.costBasis, formData.currency, formData.holdingId, formData.shares, formData.symbol, selectedSuggestion]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">
            {formData.action === 'buy' ? '추가 매수' : formData.action === 'sell' ? '매도' : tHoldings('addHolding')}
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            {formData.action === 'buy'
              ? '기존 투자 종목에 수량을 추가하고 평단을 자동으로 계산합니다.'
              : formData.action === 'sell'
                ? '보유한 투자 종목의 수량을 줄이거나 전량 매도합니다.'
                : 'Add stocks or investment products to your portfolio'}
          </p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="action" className="block text-sm font-semibold text-slate-800 mb-2">
              투자 작업 <span className="text-red-500">*</span>
            </label>
            <select
              name="action"
              id="action"
              value={formData.action}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
            >
              <option value="create">새 투자 추가</option>
              <option value="buy">추가 매수</option>
              <option value="sell">매도</option>
            </select>
          </div>

          {/* Account Selection */}
          <div>
            <label htmlFor="accountId" className="block text-sm font-semibold text-slate-800 mb-2">
              Account <span className="text-red-500">*</span>
            </label>
            <select
              name="accountId"
              id="accountId"
              value={formData.accountId}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 appearance-none pr-8"
              disabled={isLoadingAccounts}
              required
            >
              <option value="">Select Account</option>
              {accountsError && <option value="" disabled>Error loading</option>}
              {!accountsError && accounts?.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({Math.round(account.balance).toLocaleString()} {account.currency})
                </option>
              ))}
            </select>
          </div>

          {(formData.action === 'buy' || formData.action === 'sell') ? (
            <div>
              <label htmlFor="holdingId" className="block text-sm font-semibold text-slate-800 mb-2">
                대상 투자 <span className="text-red-500">*</span>
              </label>
              <select
                name="holdingId"
                id="holdingId"
                value={formData.holdingId}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
                required
              >
                <option value="">투자 종목 선택</option>
                {existingHoldings.map((holding) => (
                  <option key={holding.id} value={holding.id}>
                    {holding.symbol} · {holding.name || 'Unnamed'} · {holding.shares.toLocaleString()}주
                  </option>
                ))}
              </select>
              {selectedHolding ? (
                <p className="mt-2 text-xs text-slate-500">
                  현재 보유: {selectedHolding.shares.toLocaleString()}주 / 평단 {selectedHolding.costBasis.toFixed(2)} {selectedHolding.currency}
                </p>
              ) : null}
            </div>
          ) : null}

          {/* Symbol and Shares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="symbol" className="block text-sm font-semibold text-slate-800 mb-2">
                {tHoldings('symbol')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="symbol"
                  id="symbol"
                  value={symbolQuery}
                  onChange={handleChange}
                  autoComplete="off"
                  readOnly={formData.action !== 'create'}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400 uppercase"
                  placeholder="종목명 또는 심볼로 검색"
                  required
                />
                {formData.action === 'create' && (searchLoading || suggestions.length > 0 || searchError) && (
                  <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    {searchLoading ? (
                      <div className="px-4 py-3 text-sm text-slate-500">종목을 찾는 중...</div>
                    ) : null}
                    {!searchLoading && searchError ? (
                      <div className="px-4 py-3 text-sm text-rose-600">{searchError}</div>
                    ) : null}
                    {!searchLoading && !searchError && suggestions.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-slate-500">일치하는 종목을 찾지 못했습니다.</div>
                    ) : null}
                    {!searchLoading && suggestions.map((suggestion) => (
                      <button
                        key={`${suggestion.symbol}-${suggestion.region}`}
                        type="button"
                        onClick={() => chooseSuggestion(suggestion)}
                        className="flex w-full items-start justify-between gap-4 border-t border-slate-100 px-4 py-3 text-left transition-colors first:border-t-0 hover:bg-slate-50"
                      >
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{suggestion.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{suggestion.symbol} · {suggestion.region} · {suggestion.currency || 'N/A'}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                          {Math.round(suggestion.matchScore * 100)}%
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formData.action === 'create'
                  ? '종목명으로 검색 후 목록에서 선택하면 심볼 미스매치를 줄일 수 있습니다.'
                  : '추가 매수와 매도는 기존 투자 종목을 기준으로 처리됩니다.'}
              </p>
            </div>

            <div>
              <label htmlFor="shares" className="block text-sm font-semibold text-slate-800 mb-2">
                {tHoldings('shares')} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                name="shares"
                id="shares"
                value={formData.shares}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                placeholder="0"
                step="0.01"
                required
              />
            </div>
          </div>

          {/* Cost Basis and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="costBasis" className="block text-sm font-semibold text-slate-800 mb-2">
                {formData.action === 'sell' ? '매도가' : formData.action === 'buy' ? '매수가' : tHoldings('costBasis')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 font-medium">
                  {formData.currency === 'JPY' ? '¥' : formData.currency === 'KRW' ? '₩' : '$'}
                </span>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                  name="costBasis"
                  id="costBasis"
                  value={formData.costBasis}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                  placeholder="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-semibold text-slate-800 mb-2">
                {tAccounts('currency')}
              </label>
              <select
                name="currency"
                id="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
                required
              >
                <option value="">Select Currency</option>
                {currencies.map(curr => (
                  <option key={curr.value} value={curr.value}>{curr.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Investment Summary */}
          {formData.shares && formData.costBasis && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">Investment Summary</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">{tHoldings('symbol')}</p>
                  <p className="text-lg font-bold text-slate-800">{formData.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">{tHoldings('shares')}</p>
                  <p className="text-lg font-bold text-slate-800">{Number(formData.shares).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">
                    {formData.action === 'sell' ? '예상 매도 금액' : formData.action === 'buy' ? '추가 매수 금액' : 'Total Cost'}
                  </p>
                  <p className="text-lg font-bold text-blue-600">{totalCost.toLocaleString()}</p>
                </div>
              </div>
              {selectedSuggestion ? (
                <div className="mt-4 rounded-xl bg-white/70 px-4 py-3 text-sm text-slate-600">
                  <p className="font-semibold text-slate-800">{selectedSuggestion.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{selectedSuggestion.region} · {selectedSuggestion.currency || formData.currency}</p>
                </div>
              ) : null}
            </div>
          )}

          {/* Error Message */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{formError}</p>
            </div>
          )}

          {!selectedSuggestion && formData.action === 'create' && formData.symbol ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700 text-sm">검색 결과에서 종목을 선택해야 정확한 심볼과 주가 갱신이 연결됩니다.</p>
            </div>
          ) : null}

          {/* Success Message */}
          {mutation.isSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-green-700 text-sm">Investment added successfully!</p>
            </div>
          )}

          {/* Error from API */}
          {mutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{mutation.error.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={mutation.isPending || isLoadingAccounts || !canSubmit}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{tCommon('loading')}</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>{formData.action === 'buy' ? '추가 매수' : formData.action === 'sell' ? '매도' : tHoldings('addHolding')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default HoldingsForm
