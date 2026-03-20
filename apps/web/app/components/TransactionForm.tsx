'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useAccounts } from '../hooks/useAccounts'
import { useCategories } from '../hooks/useCategories'
import { ArrowUpRight, ArrowDownLeft, AlertCircle, CheckCircle, ArrowRightLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface TransactionFormData {
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  date: string;
  description: string;
  type: string;
  amount: number | string;
  currency: string;
  categoryKey?: string;
  notes?: string;
  applyBalanceAdjustment?: boolean;
}

const getTodayDateString = () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const isTodayDate = (date: string) => date === getTodayDateString()

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
    throw new Error(errorData.error || 'Error');
  }
  return res.json()
}

interface TransactionFormProps {
  onTransactionAdded?: () => void;
}

const TransactionForm = ({ onTransactionAdded }: TransactionFormProps) => {
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')
  const tAccounts = useTranslations('accounts')
  const tValidation = useTranslations('validation')
  const queryClient = useQueryClient()
  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useAccounts()
  const { data: categories } = useCategories()
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TransactionFormData>({
    accountId: '',
    fromAccountId: '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0] ?? '',
    description: '',
    type: 'expense',
    amount: '',
    currency: '',
    categoryKey: 'food',
    notes: '',
    applyBalanceAdjustment: true,
  })

  const searchParams = useSearchParams()
  const [isFullPayment, setIsFullPayment] = useState(false)

  useEffect(() => {
    const type = searchParams.get('type')
    const toAccountId = searchParams.get('toAccountId')
    const amount = searchParams.get('amount')

    if (type === 'transfer' && toAccountId) {
      setFormData(prev => ({
        ...prev,
        type: 'transfer',
        toAccountId,
        amount: amount || prev.amount,
        applyBalanceAdjustment: true,
      }))
      if (amount) setIsFullPayment(true)
    }
  }, [searchParams])

  const mutation = useMutation<any, Error, TransactionFormData>({
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ 
        accountId: '', 
        fromAccountId: '', 
        toAccountId: '', 
        date: new Date().toISOString().split('T')[0] ?? '', 
        description: '', 
        type: 'expense', 
        amount: '', 
        currency: '',
        categoryKey: 'food',
        notes: '',
        applyBalanceAdjustment: true,
      })
      setFormError(null)
      onTransactionAdded?.();
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormError(null)

    if (name === 'accountId') {
      const selectedAccount = accounts?.find(acc => acc.id === value);
      setFormData({
        ...formData,
        accountId: value,
        currency: selectedAccount ? selectedAccount.currency : '',
      });
    } else if (name === 'fromAccountId') {
      const selectedAccount = accounts?.find(acc => acc.id === value);
      setFormData({
        ...formData,
        fromAccountId: value,
        currency: selectedAccount ? selectedAccount.currency : '',
      });
    } else if (name === 'date') {
      setFormData({
        ...formData,
        date: value,
        applyBalanceAdjustment: isTodayDate(value),
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);

    const isTransfer = formData.type === 'transfer';

    if (!formData.date || !formData.type || !formData.amount) {
      setFormError(tValidation('allFieldsRequired'));
      return
    }

    if (isTransfer) {
      if (!formData.fromAccountId || !formData.toAccountId) {
        setFormError(tValidation('allFieldsRequired'));
        return;
      }
      if (formData.fromAccountId === formData.toAccountId) {
        setFormError(tValidation('accountsMustBeDifferent'));
        return;
      }
    } else {
      if (!formData.accountId) {
        setFormError(tValidation('allFieldsRequired'));
        return;
      }
    }

    if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      setFormError(tValidation('amountGreaterThanZero'));
      return;
    }

    mutation.mutate(formData)
  }

  const selectedAccount = accounts?.find(acc => acc.id === formData.accountId)
  const selectedToAccount = accounts?.find(acc => acc.id === formData.toAccountId)
  const isCreditCardPayment = formData.type === 'transfer' && selectedToAccount?.type === 'credit_card'
  const isTodayEntry = isTodayDate(formData.date)
  const filteredCategories = useMemo(
    () => (categories || []).filter((category) => category.type === formData.type),
    [categories, formData.type]
  )
  const fieldClassName =
    'w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-slate-50 text-slate-900 placeholder-slate-400'

  useEffect(() => {
    if (formData.type === 'transfer') {
      if (formData.categoryKey !== 'transfer') {
        setFormData((prev) => ({ ...prev, categoryKey: 'transfer' }))
      }
      return
    }

    if (filteredCategories.length > 0 && !filteredCategories.some((category) => category.key === formData.categoryKey)) {
      setFormData((prev) => ({ ...prev, categoryKey: filteredCategories[0]?.key || '' }))
    }
  }, [filteredCategories, formData.categoryKey, formData.type])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          {formData.type === 'income' ? (
            <ArrowDownLeft className="w-6 h-6" />
          ) : formData.type === 'transfer' ? (
            <ArrowRightLeft className="w-6 h-6" />
          ) : (
            <ArrowUpRight className="w-6 h-6" />
          )}
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-800">{tTransactions('addTransaction')}</h1>
          <p className="text-slate-600 text-sm mt-1">{tTransactions('recordIncomeExpense')}</p>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection */}
          {formData.type === 'transfer' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fromAccountId" className="block text-sm font-semibold text-slate-800 mb-2">
                  {tTransactions('fromAccount')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="fromAccountId"
                  id="fromAccountId"
                  value={formData.fromAccountId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                  disabled={isLoadingAccounts}
                  required
                >
                  <option value="">{tAccounts('selectAccount')}</option>
                  {accountsError && <option value="" disabled>{tCommon('error')}</option>}
                  {!accountsError && accounts?.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({Math.round(account.balance).toLocaleString()} {account.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="toAccountId" className="block text-sm font-semibold text-slate-800 mb-2">
                  {tTransactions('toAccount')} <span className="text-red-500">*</span>
                </label>
                <select
                  name="toAccountId"
                  id="toAccountId"
                  value={formData.toAccountId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                  disabled={isLoadingAccounts}
                  required
                >
                  <option value="">{tAccounts('selectAccount')}</option>
                  {accountsError && <option value="" disabled>{tCommon('error')}</option>}
                  {!accountsError && accounts?.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({Math.round(account.balance).toLocaleString()} {account.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label htmlFor="accountId" className="block text-sm font-semibold text-slate-800 mb-2">
                {tTransactions('account')} <span className="text-red-500">*</span>
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
                <option value="">{tAccounts('selectAccount')}</option>
                {accountsError && <option value="" disabled>{tCommon('error')}</option>}
                {!accountsError && accounts?.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({Math.round(account.balance).toLocaleString()} {account.currency})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">현재 계좌 잔액에 반영</p>
                <p className="mt-1 text-xs leading-6 text-slate-500">
                  오늘 거래는 자동으로 잔액에 반영됩니다. 과거 거래는 기본적으로 거래 내역만 기록하고, 필요할 때만 수동으로 반영할 수 있습니다.
                </p>
              </div>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isTodayEntry ? true : Boolean(formData.applyBalanceAdjustment)}
                  onChange={(event) => setFormData((prev) => ({ ...prev, applyBalanceAdjustment: event.target.checked }))}
                  disabled={isTodayEntry}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                />
              </label>
            </div>
            <p className={`mt-3 text-xs font-medium ${isTodayEntry ? 'text-emerald-600' : 'text-slate-500'}`}>
              {isTodayEntry ? '오늘 거래라서 잔액이 자동 반영됩니다.' : '과거 거래입니다. 체크하면 현재 잔액까지 함께 보정합니다.'}
            </p>
          </div>

          {/* Date and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="date" className="block text-sm font-semibold text-slate-800 mb-2">
                {tTransactions('date')} <span className="text-red-500">*</span>
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
                {tTransactions('type')} <span className="text-red-500">*</span>
              </label>
              <select
                name="type"
                id="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
                required
              >
                <option value="expense">{tTransactions('expense')}</option>
                <option value="income">{tTransactions('income')}</option>
                <option value="transfer">{tTransactions('transfer')}</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-semibold text-slate-800 mb-2">
              {tTransactions('description')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400"
              placeholder="e.g., Lunch, Salary"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="categoryKey" className="block text-sm font-semibold text-slate-800 mb-2">
                {tTransactions('category')}
              </label>
              <select
                name="categoryKey"
                id="categoryKey"
                value={formData.categoryKey}
                onChange={handleChange}
                disabled={formData.type === 'transfer'}
                className={`${fieldClassName} disabled:bg-slate-100`}
              >
                {formData.type === 'transfer' ? (
                  <option value="transfer">{tTransactions('transfer')}</option>
                ) : (
                  filteredCategories.map((category) => (
                    <option key={category.id} value={category.key}>
                      {category.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="block text-sm font-semibold text-slate-800 mb-2">
                {tTransactions('notes')}
              </label>
              <textarea
                name="notes"
                id="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className={`${fieldClassName} resize-none`}
                placeholder={tTransactions('notesPlaceholder')}
              />
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="amount" className="block text-sm font-semibold text-slate-800">
                  {tTransactions('amount')} <span className="text-red-500">*</span>
                </label>
                {isCreditCardPayment && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="fullPayment"
                      checked={isFullPayment}
                      onChange={(e) => {
                        setIsFullPayment(e.target.checked)
                        if (e.target.checked && selectedToAccount) {
                          setFormData(prev => ({ ...prev, amount: selectedToAccount.balance }))
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="fullPayment" className="ml-2 text-xs text-slate-600 font-medium cursor-pointer">
                      {tTransactions('payFullBalance')} ({Math.round(selectedToAccount?.balance || 0).toLocaleString()})
                    </label>
                  </div>
                )}
              </div>
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
                  className={`w-full pl-8 pr-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white text-slate-900 placeholder-slate-400 ${isFullPayment ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                  placeholder="0"
                  step="0.01"
                  required
                  readOnly={isFullPayment}
                />
              </div>
              {isCreditCardPayment && !isFullPayment && Number(formData.amount) > (selectedToAccount?.balance || 0) && (
                <div className="mt-2 flex items-start space-x-2 text-amber-600 text-xs bg-amber-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {tTransactions('amountExceedsBalance').replace('{balance}', Math.round((selectedToAccount?.balance || 0) - Number(formData.amount)).toLocaleString())}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="currency" className="block text-sm font-semibold text-slate-800 mb-2">
                {tAccounts('currency')}
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
                : formData.type === 'transfer'
                ? 'bg-blue-50 border-blue-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    formData.type === 'income'
                      ? 'text-green-700'
                      : formData.type === 'transfer' ? 'text-blue-700' : 'text-red-700'
                  }`}>
                    {formData.type === 'income' ? tTransactions('income') : formData.type === 'transfer' ? tTransactions('transfer') : tTransactions('expense')}
                  </p>
                  <p className={`text-2xl font-bold mt-1 ${
                    formData.type === 'income'
                      ? 'text-green-600'
                      : formData.type === 'transfer' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {formData.type === 'income' ? '+' : formData.type === 'transfer' ? '' : '-'}
                    {Number(formData.amount).toLocaleString()}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  formData.type === 'income'
                    ? 'bg-green-100'
                    : formData.type === 'transfer' ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  {formData.type === 'income' ? (
                    <ArrowDownLeft className="w-6 h-6 text-green-600" />
                  ) : formData.type === 'transfer' ? (
                    <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                  ) : (
                    <ArrowUpRight className="w-6 h-6 text-red-600" />
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
              <p className="text-green-700 text-sm">{tTransactions('transactionAdded')}</p>
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
                {formData.type === 'income' ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
                <span>{tTransactions('addTransaction')}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

export default TransactionForm
