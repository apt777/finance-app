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
  getCurrencySymbol, 
  getCurrencyName,
  getReverseRate 
} from '@/lib/currency'

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

const ExchangeRateManager = () => {
  const queryClient = useQueryClient()
  const { data, isLoading, isError } = useExchangeRates()
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
        throw new Error(errorData.error || '환율 업데이트 실패')
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
        throw new Error(errorData.error || '환율 삭제 실패')
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
      alert('모든 필드를 입력해 주세요.')
      return
    }

    if (formData.from === formData.to) {
      alert('출발지와 도착지가 같을 수 없습니다.')
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
    if (confirm('이 환율을 삭제하시겠습니까?')) {
      deleteRateMutation.mutate(rateId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">환율 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">환율 정보를 불러오는 중 오류 발생</p>
      </div>
    )
  }

  const exchangeRates: ExchangeRate[] = (data as ExchangeRate[]) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">환율 관리</h2>
          <p className="text-slate-600 text-sm mt-1">수동으로 환율을 설정하고 관리하세요</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>환율 추가</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">환율 설정</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* From Currency */}
              <div>
                <label htmlFor="from" className="block text-sm font-medium text-slate-700 mb-2">
                  출발지 통화
                </label>
                <select
                  id="from"
                  value={formData.from}
                  onChange={(e) => setFormData({ ...formData, from: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 appearance-none pr-8"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency} - {getCurrencyName(currency)}
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
                  title="통화 교환"
                >
                  <ArrowRightLeft className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              {/* To Currency */}
              <div>
                <label htmlFor="to" className="block text-sm font-medium text-slate-700 mb-2">
                  도착지 통화
                </label>
                <select
                  id="to"
                  value={formData.to}
                  onChange={(e) => setFormData({ ...formData, to: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 appearance-none pr-8"
                >
                  {SUPPORTED_CURRENCIES.map((currency) => (
                    <option key={currency} value={currency}>
                      {currency} - {getCurrencyName(currency)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Rate Input */}
            <div>
              <label htmlFor="rate" className="block text-sm font-medium text-slate-700 mb-2">
                환율 (1 {formData.from} = ? {formData.to})
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
                placeholder="예: 10.5"
                required
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={updateRateMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
              >
                {updateRateMutation.isPending ? '저장 중...' : '저장'}
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
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Exchange Rates List */}
      {exchangeRates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exchangeRates.map((rate) => (
            <div
              key={rate.id}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-200 card-hover"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-slate-800">
                    {rate.fromCurrency} → {rate.toCurrency}
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
                    title="수정"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(rate.id)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Rate Display */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-600 mb-1">현재 환율</p>
                <p className="text-2xl font-bold text-slate-800">
                  {rate.rate.toFixed(6)}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  1 {getCurrencySymbol(rate.fromCurrency as any)} = {rate.rate.toFixed(6)} {getCurrencySymbol(rate.toCurrency as any)}
                </p>
              </div>

              {/* Last Updated */}
              {rate.updatedAt && (
                <div className="flex items-center space-x-2 text-xs text-slate-500">
                  <Calendar className="w-4 h-4" />
                  <span>
                    마지막 업데이트: {new Date(rate.updatedAt).toLocaleDateString('ko-KR', {
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
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <RefreshCw className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-4">설정된 환율이 없습니다.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>첫 환율 추가하기</span>
          </button>
        </div>
      )}

      {/* Error Messages */}
      {updateRateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          <p className="font-medium">환율 업데이트 오류</p>
          <p className="text-xs mt-1">{updateRateMutation.error.message}</p>
        </div>
      )}

      {deleteRateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          <p className="font-medium">환율 삭제 오류</p>
          <p className="text-xs mt-1">{deleteRateMutation.error.message}</p>
        </div>
      )}
    </div>
  )
}

export default ExchangeRateManager
