'use client'

import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { useAccounts } from '../hooks/useAccounts'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'

interface BulkTransaction {
  date: string
  description: string
  amount: number
  type: string
  accountId: string
  currency?: string
}

interface ParsedRow {
  date: string
  description: string
  amount: string
  type: string
  account: string
  currency?: string
}

const BulkTransactionImport = () => {
  const locale = useLocale()
  const tTransactions = useTranslations('transactions')
  const ui = getUiCopy(locale)
  const csvExample =
    locale === 'en'
      ? `date,description,type,amount,accountName,currency
2024-12-16,Lunch,expense,5000,Japan Account,JPY
2024-12-15,Salary,income,1000000,Korea Account,KRW
2024-12-14,Online shopping,expense,50,US Account,USD`
      : locale === 'ja'
        ? `日付,説明,種類,金額,口座名,通貨
2024-12-16,昼食,expense,5000,日本口座,JPY
2024-12-15,給与,income,1000000,韓国口座,KRW
2024-12-14,オンラインショッピング,expense,50,米国口座,USD`
        : locale === 'zh'
          ? `日期,说明,类型,金额,账户名,货币
2024-12-16,午餐,expense,5000,日本账户,JPY
2024-12-15,工资,income,1000000,韩国账户,KRW
2024-12-14,在线购物,expense,50,美国账户,USD`
          : `날짜,설명,유형,금액,계좌명,통화
2024-12-16,점심 식사,expense,5000,일본 통장,JPY
2024-12-15,급여,income,1000000,한국 통장,KRW
2024-12-14,온라인 쇼핑,expense,50,미국 계좌,USD`
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importMethod, setImportMethod] = useState<'csv' | 'manual'>('manual')
  const [transactions, setTransactions] = useState<BulkTransaction[]>([])
  const [errors, setErrors] = useState<{ [key: number]: string }>({})
  const [successMessage, setSuccessMessage] = useState('')

  interface TransactionFormData {
    date: string
    description: string
    amount: string
    type: string
    accountId: string
    currency: string
  }

  // Manual form state
  const [formData, setFormData] = useState<TransactionFormData>({
    date: new Date().toISOString().split('T')[0] ?? '',
    description: '',
    amount: '',
    type: 'expense',
    accountId: '',
    currency: 'JPY',
  })

  // Bulk import mutation
  const importMutation = useMutation<any, Error, BulkTransaction[]>({
    mutationFn: async (txns: BulkTransaction[]) => {
      const res = await fetch('/api/transactions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactions: txns }),
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || ui.bulkImport.failed)
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setTransactions([])
      setFormData({
        date: new Date().toISOString().split('T')[0] ?? '',
        description: '',
        amount: '',
        type: 'expense',
        accountId: '',
        currency: 'JPY',
      })
      setSuccessMessage(ui.bulkImport.success)
      setTimeout(() => setSuccessMessage(''), 3000)
    },
  })

  // Validate transaction
  const validateTransaction = (txn: BulkTransaction, index: number): boolean => {
    const newErrors = { ...errors }

    if (!txn.date) {
      newErrors[index] = ui.bulkImport.dateRequired
      return false
    }

    if (!txn.description) {
      newErrors[index] = ui.bulkImport.descriptionRequired
      return false
    }

    if (!txn.amount || isNaN(txn.amount)) {
      newErrors[index] = ui.bulkImport.amountRequired
      return false
    }

    if (!txn.accountId) {
      newErrors[index] = ui.bulkImport.accountRequired
      return false
    }

    delete newErrors[index]
    setErrors(newErrors)
    return true
  }

  // Add transaction manually
  const handleAddTransaction = () => {
    if (!formData.accountId || !formData.description || !formData.amount) {
      alert(ui.bulkImport.fillAll)
      return
    }

    const newTxn: BulkTransaction = {
      date: formData.date,
      description: formData.description,
      amount: parseFloat(formData.amount) * (formData.type === 'expense' ? -1 : 1),
      type: formData.type,
      accountId: formData.accountId,
      currency: formData.currency,
    }

    if (validateTransaction(newTxn, transactions.length)) {
      setTransactions([...transactions, newTxn])
      setFormData({
        date: new Date().toISOString().split('T')[0] ?? '',
        description: '',
        amount: '',
        type: 'expense',
        accountId: '',
        currency: 'JPY',
      })
    }
  }

  // Handle CSV upload
  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').filter((line) => line.trim())

        // Skip header
        const rows = lines.slice(1)
        const importedTxns: BulkTransaction[] = []
        const newErrors: { [key: number]: string } = {}

        rows.forEach((row, index) => {
          const [date, description, type, amount, accountName, currency] = row
            .split(',')
            .map((col) => col.trim())

          // Find account by name
          const account = (accounts as any[])?.find(
            (acc) => acc.name.toLowerCase() === accountName?.toLowerCase()
          )

          if (!account) {
            newErrors[index] = ui.bulkImport.accountNotFound(accountName || '')
            return
          }

          const txn: BulkTransaction = {
            date: date ?? '',
            description: description ?? '',
            amount: parseFloat(amount ?? '0') * (type?.toLowerCase() === 'expense' ? -1 : 1),
            type: type ?? 'expense',
            accountId: account.id,
            currency: currency || account.currency,
          }

          if (validateTransaction(txn, index)) {
            importedTxns.push(txn)
          }
        })

        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors)
        }

        setTransactions(importedTxns)
      } catch (error) {
        alert(ui.bulkImport.csvParseError((error as Error).message))
      }
    }

    reader.readAsText(file)
  }

  // Remove transaction
  const handleRemoveTransaction = (index: number) => {
    setTransactions(transactions.filter((_, i) => i !== index))
    const newErrors = { ...errors }
    delete newErrors[index]
    setErrors(newErrors)
  }

  // Submit
  const handleSubmit = () => {
    if (transactions.length === 0) {
      alert(ui.bulkImport.noTransactions)
      return
    }

    // Validate all
    let hasErrors = false
    const newErrors: { [key: number]: string } = {}

    transactions.forEach((txn, index) => {
      if (!validateTransaction(txn, index)) {
        hasErrors = true
      }
    })

    if (hasErrors) {
      alert(ui.bulkImport.fixErrors)
      return
    }

    importMutation.mutate(transactions)
  }

  const accountsList = (accounts as any[]) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{ui.bulkImport.title}</h2>
          <p className="text-slate-600 text-sm mt-1">{ui.bulkImport.subtitle}</p>
        </div>
      </div>

      {/* Import Method Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{ui.bulkImport.methodTitle}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => setImportMethod('manual')}
            className={`p-4 rounded-xl border-2 transition-all ${
              importMethod === 'manual'
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <Plus className="w-6 h-6 mb-2" />
            <p className="font-semibold text-slate-800">{ui.bulkImport.manual}</p>
            <p className="text-xs text-slate-600 mt-1">{ui.bulkImport.manualDesc}</p>
          </button>
          <button
            onClick={() => setImportMethod('csv')}
            className={`p-4 rounded-xl border-2 transition-all ${
              importMethod === 'csv'
                ? 'border-blue-600 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <FileText className="w-6 h-6 mb-2" />
            <p className="font-semibold text-slate-800">{ui.bulkImport.csv}</p>
            <p className="text-xs text-slate-600 mt-1">{ui.bulkImport.csvDesc}</p>
          </button>
        </div>
      </div>

      {/* Manual Input Form */}
      {importMethod === 'manual' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{ui.bulkImport.addEntryTitle}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ui.bulkImport.date}
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ui.bulkImport.account}
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{ui.bulkImport.selectAccount}</option>
                {accountsList.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ui.bulkImport.description}
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={ui.bulkImport.descriptionPlaceholder}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ui.bulkImport.amount}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {ui.bulkImport.type}
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">{tTransactions('expense')}</option>
                <option value="income">{tTransactions('income')}</option>
                <option value="transfer">{tTransactions('transfer')}</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAddTransaction}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {ui.bulkImport.addRow}
          </button>
        </div>
      )}

      {/* CSV Upload Form */}
      {importMethod === 'csv' && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">{ui.bulkImport.csvUploadTitle}</h3>
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">{ui.bulkImport.csvDrop}</p>
              <p className="text-xs text-slate-600 mt-1">
                {ui.bulkImport.csvFormat}
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />

            {/* CSV Format Example */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-800 mb-2">{ui.bulkImport.csvExample}:</p>
              <pre className="text-xs text-slate-600 overflow-x-auto">
{csvExample}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            {ui.bulkImport.scheduled(transactions.length)}
          </h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {transactions.map((txn, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  errors[index]
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="font-semibold text-slate-800">
                        {txn.description}
                      </span>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          txn.amount > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {txn.amount > 0 ? '+' : '-'}
                        {Math.abs(txn.amount).toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>{ui.bulkImport.dateLabel(txn.date)}</p>
                      <p>{ui.bulkImport.accountLabel(accountsList.find((acc) => acc.id === txn.accountId)?.name || 'Unknown')}</p>
                      <p>{ui.bulkImport.typeLabel(txn.type)}</p>
                    </div>
                    {errors[index] && (
                      <div className="flex items-start space-x-2 mt-2 text-red-600 text-xs">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{errors[index]}</span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveTransaction(index)}
                    className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={importMutation.isPending}
            className="w-full mt-4 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            {importMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>{ui.bulkImport.importing}</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>{ui.bulkImport.submit(transactions.length)}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-600 text-sm flex items-center space-x-2">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {importMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          <p className="font-medium">{ui.bulkImport.errorTitle}</p>
          <p className="text-xs mt-1">{importMutation.error.message}</p>
        </div>
      )}
    </div>
  )
}

export default BulkTransactionImport
