'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccounts } from '@/hooks/useAccounts'
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface HoldingFormData {
  accountId: string;
  symbol: string;
  shares: number | string;
  costBasis: number | string;
  currency: string;
}

const createHolding = async (holdingData: HoldingFormData) => {
  const res = await fetch('/api/holdings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...holdingData,
      shares: Number(holdingData.shares),
      costBasis: Number(holdingData.costBasis),
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
  const queryClient = useQueryClient()
  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useAccounts()
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState<HoldingFormData>({
    accountId: '',
    symbol: '',
    shares: '',
    costBasis: '',
    currency: '',
  })

  const mutation = useMutation<any, Error, HoldingFormData>({
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ accountId: '', symbol: '', shares: '', costBasis: '', currency: '' })
      setFormError(null)
      onHoldingAdded?.();
    },
  })

  const currencies = [
    { value: 'JPY', label: 'JPY (¥)' },
    { value: 'KRW', label: 'KRW (₩)' },
    { value: 'USD', label: 'USD ($)' },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null)

    if (name === 'accountId') {
      const account = accounts?.find(acc => acc.id === value);
      setFormData({
        ...formData,
        accountId: value,
        currency: account ? account.currency : ''
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.accountId || !formData.symbol || !formData.shares || !formData.costBasis || !formData.currency) {
      setFormError('Please fill in all required fields.')
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

  const selectedAccount = accounts?.find(acc => acc.id === formData.accountId)
  const totalCost = formData.shares && formData.costBasis
    ? Number(formData.shares) * Number(formData.costBasis)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <TrendingUp className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tHoldings('addHolding')}</h1>
          <p className="text-slate-600 text-sm mt-1">Add stocks or investment products to your portfolio</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
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

          {/* Symbol and Shares */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="symbol" className="block text-sm font-semibold text-slate-800 mb-2">
                {tHoldings('symbol')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="symbol"
                id="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400 uppercase"
                placeholder="e.g., AAPL, MSFT, 9984"
                required
              />
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
                {tHoldings('costBasis')} <span className="text-red-500">*</span>
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
                  <p className="text-xs text-slate-600 mb-1">Total Cost</p>
                  <p className="text-lg font-bold text-blue-600">{totalCost.toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {formError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-red-700 text-sm">{formError}</p>
            </div>
          )}

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
            disabled={mutation.isPending || isLoadingAccounts}
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
                <span>{tHoldings('addHolding')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default HoldingsForm
