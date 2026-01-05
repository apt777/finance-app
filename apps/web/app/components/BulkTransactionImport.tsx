'use client'

import React, { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Upload, FileText, Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'

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
  const queryClient = useQueryClient()
  const { data: accounts } = useAccounts()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [importMethod, setImportMethod] = useState<'csv' | 'manual'>('manual')
  const [transactions, setTransactions] = useState<BulkTransaction[]>([])
  const [errors, setErrors] = useState<{ [key: number]: string }>({})
  const [successMessage, setSuccessMessage] = useState('')

  // Manual form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
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
        throw new Error(errorData.error || '거래 내역 일괄 입력 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setTransactions([])
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'expense',
        accountId: '',
        currency: 'JPY',
      })
      setSuccessMessage('거래 내역이 성공적으로 입력되었습니다!')
      setTimeout(() => setSuccessMessage(''), 3000)
    },
  })

  // Validate transaction
  const validateTransaction = (txn: BulkTransaction, index: number): boolean => {
    const newErrors = { ...errors }

    if (!txn.date) {
      newErrors[index] = '날짜를 입력해 주세요.'
      return false
    }

    if (!txn.description) {
      newErrors[index] = '설명을 입력해 주세요.'
      return false
    }

    if (!txn.amount || isNaN(txn.amount)) {
      newErrors[index] = '유효한 금액을 입력해 주세요.'
      return false
    }

    if (!txn.accountId) {
      newErrors[index] = '계좌를 선택해 주세요.'
      return false
    }

    delete newErrors[index]
    setErrors(newErrors)
    return true
  }

  // Add transaction manually
  const handleAddTransaction = () => {
    if (!formData.accountId || !formData.description || !formData.amount) {
      alert('모든 필드를 입력해 주세요.')
      return
    }

    const newTxn: BulkTransaction = {
      date: formData.date || new Date().toISOString().split('T')[0],
      description: formData.description,
      amount: parseFloat(formData.amount) * (formData.type === 'expense' ? -1 : 1),
      type: formData.type,
      accountId: formData.accountId,
      currency: formData.currency || 'JPY',
    }

    if (validateTransaction(newTxn, transactions.length)) {
      setTransactions([...transactions, newTxn])
      setFormData({
        date: new Date().toISOString().split('T')[0],
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
            (acc) => acc.name.toLowerCase() === accountName.toLowerCase()
          )

          if (!account) {
            newErrors[index] = `계좌를 찾을 수 없습니다: ${accountName}`
            return
          }

          const txn: BulkTransaction = {
            date,
            description,
            amount: parseFloat(amount) * (type.toLowerCase() === 'expense' ? -1 : 1),
            type,
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
        alert('CSV 파일 파싱 오류: ' + (error as Error).message)
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
      alert('입력할 거래 내역이 없습니다.')
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
      alert('오류가 있는 거래 내역이 있습니다. 수정해 주세요.')
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
          <h2 className="text-2xl font-bold text-slate-800">거래 내역 일괄 입력</h2>
          <p className="text-slate-600 text-sm mt-1">여러 거래 내역을 한 번에 입력하세요</p>
        </div>
      </div>

      {/* Import Method Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">입력 방법 선택</h3>
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
            <p className="font-semibold text-slate-800">수동 입력</p>
            <p className="text-xs text-slate-600 mt-1">한 번에 하나씩 입력</p>
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
            <p className="font-semibold text-slate-800">CSV 업로드</p>
            <p className="text-xs text-slate-600 mt-1">파일에서 일괄 입력</p>
          </button>
        </div>
      </div>

      {/* Manual Input Form */}
      {importMethod === 'manual' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">거래 내역 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                날짜
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
                계좌
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">계좌 선택</option>
                {accountsList.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                설명
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 점심 식사"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                금액
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
                유형
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">지출</option>
                <option value="income">수입</option>
                <option value="transfer">이체</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleAddTransaction}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            거래 추가
          </button>
        </div>
      )}

      {/* CSV Upload Form */}
      {importMethod === 'csv' && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">CSV 파일 업로드</h3>
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-blue-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors"
            >
              <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">CSV 파일을 여기에 드래그하거나 클릭</p>
              <p className="text-xs text-slate-600 mt-1">
                형식: 날짜, 설명, 유형, 금액, 계좌명, 통화
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
              <p className="text-sm font-medium text-slate-800 mb-2">CSV 형식 예시:</p>
              <pre className="text-xs text-slate-600 overflow-x-auto">
{`날짜,설명,유형,금액,계좌명,통화
2024-12-16,점심 식사,expense,5000,일본 통장,JPY
2024-12-15,급여,income,1000000,한국 통장,KRW
2024-12-14,온라인 쇼핑,expense,50,미국 계좌,USD`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            입력 예정 거래 ({transactions.length}개)
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
                      <p>날짜: {txn.date}</p>
                      <p>
                        계좌:{' '}
                        {
                          accountsList.find((acc) => acc.id === txn.accountId)
                            ?.name
                        }
                      </p>
                      <p>유형: {txn.type}</p>
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
                <span>입력 중...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>거래 내역 입력 ({transactions.length}개)</span>
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
          <p className="font-medium">거래 내역 입력 오류</p>
          <p className="text-xs mt-1">{importMutation.error.message}</p>
        </div>
      )}
    </div>
  )
}

export default BulkTransactionImport
