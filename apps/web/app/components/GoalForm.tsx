'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Target, AlertCircle, CheckCircle } from 'lucide-react'

interface GoalFormData {
  userId: string;
  name: string;
  targetAmount: number | string;
  currentAmount: number | string;
  targetDate: string;
  targetCurrency: string;
}

const createGoal = async (goalData: GoalFormData) => {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...goalData,
      targetAmount: Number(goalData.targetAmount),
      currentAmount: Number(goalData.currentAmount),
      targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null,
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '목표 생성 실패');
  }
  return res.json()
}

const GoalForm = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<GoalFormData>({
    userId: '',
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
    targetCurrency: 'JPY',
  })
  const [formError, setFormError] = useState<string | null>(null)

  const mutation = useMutation<any, Error, GoalFormData>({
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setFormData({ userId: '', name: '', targetAmount: '', currentAmount: '', targetDate: '', targetCurrency: 'JPY' })
      setFormError(null)
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setFormError(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!formData.userId || !formData.name || !formData.targetAmount || !formData.currentAmount || !formData.targetCurrency) {
      setFormError('모든 필수 필드를 입력해 주세요.')
      return
    }

    if (isNaN(Number(formData.targetAmount)) || isNaN(Number(formData.currentAmount))) {
      setFormError('목표 금액과 현재 금액은 숫자여야 합니다.')
      return;
    }

    if (Number(formData.currentAmount) > Number(formData.targetAmount)) {
      setFormError('현재 금액이 목표 금액보다 클 수 없습니다.')
      return;
    }

    mutation.mutate(formData)
  }
  
  const progress = formData.targetAmount && formData.currentAmount
    ? (Number(formData.currentAmount) / Number(formData.targetAmount)) * 100
    : 0
    
  const currencies = [
    { value: 'JPY', label: '일본 엔 (¥)' },
    { value: 'KRW', label: '한국 원 (₩)' },
    { value: 'USD', label: '미국 달러 ($)' },
  ]

  const currentCurrencyLabel = currencies.find(c => c.value === formData.targetCurrency)?.label || 'JPY'
  const symbol = currentCurrencyLabel.split('(')[1]?.replace(')','') || '¥'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <Target className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">새 목표 추가</h1>
          <p className="text-slate-600 text-sm mt-1">재정 목표를 설정하고 진행 상황을 추적하세요</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* User ID */}
          <div>
            <label htmlFor="userId" className="block text-sm font-semibold text-slate-800 mb-2">
              사용자 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="userId"
              id="userId"
              value={formData.userId}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              placeholder="사용자 ID 입력"
              required
            />
          </div>

          {/* Goal Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-800 mb-2">
              목표명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              placeholder="예: 해외 여행 자금, 주택 구매 자금"
              required
            />
          </div>

          {/* Target Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="targetAmount" className="block text-sm font-semibold text-slate-800 mb-2">
                목표 금액 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 font-medium">{symbol}</span>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                  name="targetAmount"
                  id="targetAmount"
                  value={formData.targetAmount}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                  placeholder="0"
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="targetCurrency" className="block text-sm font-semibold text-slate-800 mb-2">
                통화 <span className="text-red-500">*</span>
              </label>
              <select
                name="targetCurrency"
                id="targetCurrency"
                value={formData.targetCurrency}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 appearance-none pr-8"
                required
              >
                {currencies.map(curr => (
                  <option key={curr.value} value={curr.value}>{curr.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Current Amount */}
          <div>
              <label htmlFor="currentAmount" className="block text-sm font-semibold text-slate-800 mb-2">
                현재 금액 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 font-medium">{symbol}</span>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                  name="currentAmount"
                  id="currentAmount"
                  value={formData.currentAmount}
                  onChange={handleChange}
                  className="w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                  placeholder="0"
                  required
                />
              </div>
            </div>

          {/* Progress Preview */}
          {formData.targetAmount && formData.currentAmount && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-700">진행률</span>
                <span className="text-sm font-bold text-blue-600">{progress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-600">
                <span>{Number(formData.currentAmount).toLocaleString()} / {Number(formData.targetAmount).toLocaleString()}</span>
                <span>{(Number(formData.targetAmount) - Number(formData.currentAmount)).toLocaleString()} 남음</span>
              </div>
            </div>
          )}

          {/* Target Date */}
          <div>
            <label htmlFor="targetDate" className="block text-sm font-semibold text-slate-800 mb-2">
              목표 달성 날짜 <span className="text-slate-500 text-xs">(선택사항)</span>
            </label>
            <input
              type="date"
              name="targetDate"
              id="targetDate"
              value={formData.targetDate}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
            />
          </div>

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
              <p className="text-green-700 text-sm">목표가 성공적으로 추가되었습니다!</p>
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
            disabled={mutation.isPending}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {mutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>추가 중...</span>
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                <span>목표 추가</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default GoalForm
