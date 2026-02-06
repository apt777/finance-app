'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, CheckCircle, Wallet } from 'lucide-react'

// userId is no longer needed from the form
interface AccountFormData {
  name: string;
  type: string;
  balance: number | string;
  currency: string;
}

const createAccount = async (accountData: Omit<AccountFormData, 'userId'>) => {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...accountData,
      balance: Number(accountData.balance),
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create account');
  }
  return res.json()
}

interface AccountFormProps {
  onAccountAdded?: () => void;
}

const AccountForm = ({ onAccountAdded }: AccountFormProps) => {
  const queryClient = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: 'checking',
    balance: '',
    currency: 'JPY',
  })

  const mutation = useMutation<any, Error, AccountFormData>({ // Explicitly type mutation
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ name: '', type: 'checking', balance: '', currency: 'JPY' }) // Clear form
      setFormError(null)
      onAccountAdded?.(); // Call the callback
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);
    if (!formData.name || !formData.type || !formData.balance || !formData.currency) {
      setFormError('모든 필드를 입력해 주세요.');
      return
    }
    if (isNaN(Number(formData.balance))) {
      setFormError('잔액은 숫자여야 합니다.');
      return;
    }
    mutation.mutate(formData)
  }

  const accountTypes = [
    { value: 'checking', label: '입출금' },
    { value: 'savings', label: '예적금' },
    { value: 'credit_card', label: '신용카드' },
    { value: 'investment', label: '투자' },
    { value: 'nisa', label: 'NISA' },
  ]

  const currencies = [
    { value: 'JPY', label: '일본 엔 (¥)' },
    { value: 'KRW', label: '한국 원 (₩)' },
    { value: 'USD', label: '미국 달러 ($)' },
  ]

  return (
    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-lg border border-slate-200 p-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white">
          <Wallet className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">새 계좌 추가</h2>
          <p className="text-sm text-slate-600">새로운 계좌를 추가하여 자산을 관리하세요</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-semibold text-slate-800 mb-2">
            계좌 이름 *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="예: 메인 계좌, 여행 자금"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
            required
          />
        </div>

        {/* Account Type & Currency Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Account Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-semibold text-slate-800 mb-2">
              계좌 종류 *
            </label>
            <select
              name="type"
              id="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
              required
            >
              {accountTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div>
            <label htmlFor="currency" className="block text-sm font-semibold text-slate-800 mb-2">
              통화 *
            </label>
            <select
              name="currency"
              id="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900"
              required
            >
              {currencies.map(curr => (
                <option key={curr.value} value={curr.value}>{curr.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Balance */}
        <div>
          <label htmlFor="balance" className="block text-sm font-semibold text-slate-800 mb-2">
            초기 잔액 *
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
              name="balance"
              id="balance"
              value={formData.balance}
              onChange={handleChange}
              placeholder="0"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              required
            />
            <span className="absolute right-4 top-3 text-slate-600 font-medium">
              {formData.currency}
            </span>
          </div>
        </div>

        {/* Error Message */}
        {formError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{formError}</p>
          </div>
        )}

        {/* Success Message */}
        {mutation.isSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-green-700 text-sm">계좌가 성공적으로 추가되었습니다!</p>
          </div>
        )}

        {/* Error from API */}
        {mutation.isError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">오류: {mutation.error.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          {mutation.isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>추가 중...</span>
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span>계좌 추가</span>
            </>
          )}
        </button>
      </form>
    </div>
  )
}

export default AccountForm
