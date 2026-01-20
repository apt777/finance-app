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

    if (txn.amount === undefined || isNaN(txn.amount)) {
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
      currency: formData.currency,
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
          const account = accountName ? (accounts as any[])?.find(
            (acc) => acc.name.toLowerCase() === accountName.toLowerCase()
          ) : undefined;

          if (!account) {
            newErrors[index] = `계좌를 찾을 수 없습니다: ${accountName}`
            return
          }
          
          if(!date || !description || !amount || !type) {
            newErrors[index] = '필수 CSV 필드가 누락되었습니다.'
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
            className={`p-4 rounded-xl border-2 transition-all ${importMethod === 'manual' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <Plus className="w-6 h-6 mb-2" />
            <p className="font-semibold text-slate-800">수동 입력</p>
            <p className="text-xs text-slate-600 mt-1">한 번에 하나씩 입력</p>
          </button>
          <button
            onClick={() => setImportMethod('csv')}
            className={`p-4 rounded-xl border-2 transition-all ${importMethod === 'csv' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder-slate-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                계좌
              </label>
              <select
                value={formData.accountId}
                onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 appearance-none pr-8"
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
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder-slate-400"
                placeholder="예: 점심 식사"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                금액
              </label>
              <div className="flex space-x-2">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-32 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 appearance-none pr-8"
                >
                  <option value="expense">지출</option>
                  <option value="income">수입</option>
                </select>
                <input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder-slate-400"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleAddTransaction}
            className="w-full py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-900 transition-all flex items-center justify-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>목록에 추가</span>
          </button>
        </div>
      )}

      {/* CSV Upload */}
      {importMethod === 'csv' && (
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-200 text-center">
          <input
            type="file"
            accept=".csv"
            onChange={handleCSVUpload}
            ref={fileInputRef}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-2xl p-12 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer group"
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4 group-hover:text-blue-500" />
            <p className="text-lg font-semibold text-slate-800">CSV 파일을 선택하거나 드래그하세요</p>
            <p className="text-sm text-slate-500 mt-2">날짜, 설명, 유형, 금액, 계좌명, 통화 순서의 CSV 파일</p>
          </div>
        </div>
      )}

      {/* Transaction List */}
      {transactions.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800">입력 예정 거래 ({transactions.length}건)</h3>
            <button
              onClick={() => setTransactions([])}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              전체 삭제
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">날짜</th>
                  <th className="px-6 py-4">설명</th>
                  <th className="px-6 py-4">계좌</th>
                  <th className="px-6 py-4 text-right">금액</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((txn, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-all">
                    <td className="px-6 py-4 text-slate-800">{txn.date}</td>
                    <td className="px-6 py-4 text-slate-800 font-medium">{txn.description}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {accountsList.find(a => a.id === txn.accountId)?.name || '알 수 없음'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${txn.amount < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                      {txn.amount.toLocaleString()} {txn.currency}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleRemoveTransaction(index)}
                        className="text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <button
              onClick={handleSubmit}
              disabled={importMutation.isPending}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {importMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>처리 중...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>{transactions.length}건의 거래 내역 입력하기</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center space-x-3 text-emerald-700">
          <CheckCircle className="w-5 h-5" />
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center space-x-3 text-red-700 mb-2">
            <AlertCircle className="w-5 h-5" />
            <p className="font-bold">입력 오류 발생</p>
          </div>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
            {Object.entries(errors).map(([index, error]) => (
              <li key={index}>행 {parseInt(index) + 1}: {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default BulkTransactionImport
