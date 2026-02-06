'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccounts } from '../hooks/useAccounts'
import { ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle } from 'lucide-react'

interface TransactionFormData {
  accountId: string;
  date: string;
  description: string;
  type: string;
  amount: number | string;
  currency: string;
}

const createTransaction = async (transactionData: TransactionFormData) => {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...transactionData,
      amount: Number(transactionData.amount),
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || '거래 내역 생성 실패');
  }
  return res.json()
}

interface TransactionFormProps {
  onTransactionAdded?: () => void;
}

const TransactionForm = ({ onTransactionAdded }: TransactionFormProps) => {
  const queryClient = useQueryClient()
  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useAccounts()
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    accountId: '',
    date: new Date().toISOString().split('T')[0] ?? '',
    description: '',
    type: 'expense',
    amount: '',
    currency: '',
  })

  const mutation = useMutation<any, Error, TransactionFormData>({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ accountId: '', date: new Date().toISOString().split('T')[0] ?? '', description: '', type: 'expense', amount: '', currency: '' })
      setFormError(null)
      onTransactionAdded?.();
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormError(null)

    if (name === 'accountId') {
      const selectedAccount = accounts?.find(acc => acc.id === value);
      if (selectedAccount) {
        setFormData({
          ...formData,
          accountId: value,
          currency: selectedAccount.currency,
        });
      } else {
        setFormData({ ...formData, accountId: value, currency: '' });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);

    if (!formData.accountId || !formData.date || !formData.description || !formData.type || !formData.amount) {
      setFormError('모든 필수 필드를 입력해 주세요.');
      return
    }

    if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setFormError('금액은 0보다 큰 숫자여야 합니다.');
      return;
    }

    mutation.mutate(formData)
  }

  const selectedAccount = accounts?.find(acc => acc.id === formData.accountId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          {formData.type === 'income' ? (
            <ArrowDownLeft className="w-6 h-6" />
          ) : (
            <ArrowUpRight className="w-6 h-6" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">새 거래 내역 추가</h1>
          <p className="text-slate-600 text-sm mt-1">수입 또는 지출을 기록하세요</p>
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
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
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

          {/* Date and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="date" className="block text-sm font-semibold text-slate-800 mb-2">
                날짜 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="date"
                id="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                required
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-semibold text-slate-800 mb-2">
                유형 <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                id="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                required
              >
                <option value="expense">지출</option>
                <option value="income">수입</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-800 mb-2">
              내용 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              placeholder="예: 점심 식사, 월급"
              required
            />
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-semibold text-slate-800 mb-2">
                금액 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-slate-500 font-medium">
                  {formData.currency === 'JPY' ? '¥' : formData.currency === 'KRW' ? '₩' : '$'}
                </span>
                <input
                  type="number"
                  min="0"
                  onKeyDown={(e) => (e.key === '-' || e.key === 'e') && e.preventDefault()}
                  name="amount"
                  id="amount"
                  value={formData.amount}
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

          {/* Transaction Preview */}
          {formData.amount && formData.currency && (
            <div className={`rounded-xl p-4 border-2 ${
              formData.type === 'income'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    formData.type === 'income'
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    {formData.type === 'income' ? '수입' : '지출'}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    formData.type === 'income'
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}>
                    {formData.type === 'income' ? '+' : '-'}
                    {Number(formData.amount).toLocaleString()}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  formData.type === 'income'
                    ? 'bg-green-100'
                    : 'bg-red-100'
                }`}>
                  {formData.type === 'income' ? (
                    <ArrowDownLeft className={`w-6 h-6 ${
                      formData.type === 'income'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`} />
                  ) : (
                    <ArrowUpRight className={`w-6 h-6 ${
                      formData.type === 'income'
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`} />
                  )}
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
              <p className="text-green-700 text-sm">거래 내역이 성공적으로 추가되었습니다!</p>
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
                {formData.type === 'income' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                <span>거래 내역 추가</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default TransactionForm
