'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccounts } from '../hooks/useAccounts'
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react'

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
    throw new Error(errorData.error || '투자 추가 실패');
  }
  return res.json()
}

interface HoldingsFormProps {
  onHoldingAdded?: () => void;
}

const HoldingsForm = ({ onHoldingAdded }: HoldingsFormProps) => {
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null)
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.accountId || !formData.symbol || !formData.shares || !formData.costBasis || !formData.currency) {
      setFormError('모든 필수 필드를 입력해 주세요.')
      return
    }

    if (isNaN(Number(formData.shares)) || isNaN(Number(formData.costBasis))) {
      setFormError('주수와 매입가는 숫자여야 합니다.')
      return;
    }

    if (Number(formData.shares) <= 0 || Number(formData.costBasis) <= 0) {
      setFormError('주수와 매입가는 0보다 커야 합니다.')
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
          <h1 className="text-3xl font-bold text-slate-800">새 투자 추가</h1>
          <p className="text-slate-600 text-sm mt-1">주식 또는 투자 상품을 포트폴리오에 추가하세요</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection */}
          <div>
            <label htmlFor="accountId" className="block text-sm font-semibold text-slate-800 mb-2">
              계좌 <span className="text-red-500">*</span>
            </label>
            <select
              name="accountId"
              id="accountId"
              value={formData.accountId}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              disabled={isLoadingAccounts}
              required
            >
              <option value="">계좌 선택</option>
              {accountsError && <option value="" disabled>계좌 로딩 오류</option>}
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
                종목 코드 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="symbol"
                id="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase"
                placeholder="예: AAPL, MSFT, 9984"
                required
              />
            </div>

            <div>
              <label htmlFor="shares" className="block text-sm font-semibold text-slate-800 mb-2">
                주수 <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="shares"
                id="shares"
                value={formData.shares}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                매입가 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 font-medium">
                  {formData.currency === 'JPY' ? '¥' : formData.currency === 'KRW' ? '₩' : '$'}
                </span>
                <input
                  type="number"
                  name="costBasis"
                  id="costBasis"
                  value={formData.costBasis}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="0"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-semibold text-slate-800 mb-2">
                통화
              </label>
              <input
                type="text"
                name="currency"
                id="currency"
                value={formData.currency}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-medium"
                readOnly
              />
            </div>
          </div>

          {/* Investment Summary */}
          {formData.shares && formData.costBasis && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-sm font-semibold text-slate-800 mb-4">투자 요약</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-600 mb-1">종목</p>
                  <p className="text-lg font-bold text-slate-800">{formData.symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">주수</p>
                  <p className="text-lg font-bold text-slate-800">{Number(formData.shares).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 mb-1">총 매입액</p>
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
              <p className="text-green-700 text-sm">투자가 성공적으로 추가되었습니다!</p>
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
                <span>추가 중...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>투자 추가</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default HoldingsForm
