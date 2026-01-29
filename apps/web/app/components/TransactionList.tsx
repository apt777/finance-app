'use client'

import React, { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { ArrowUpRight, ArrowDownLeft, Filter, Download } from 'lucide-react'

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  currency: string;
  account?: {
    name: string;
    currency: string;
  };
}

const TransactionList = ({ accountId }: { accountId?: string }) => {
  const { data, error, isLoading } = useTransactions(accountId)
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">거래 내역 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">거래 내역을 불러오는 중 오류 발생</p>
      </div>
    )
  }

  const transactions: Transaction[] = (data as Transaction[]) || []

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    if (filterType === 'income') return t.amount > 0
    if (filterType === 'expense') return t.amount < 0
    return true
  })

  // Sort transactions
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    } else {
      return Math.abs(b.amount) - Math.abs(a.amount)
    }
  })

  // Calculate summary
  const totalIncome = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['날짜', '설명', '유형', '금액', '통화', '계좌']
    const rows = sortedTransactions.map(t => [
      new Date(t.date).toLocaleDateString(),
      t.description,
      t.type,
      t.amount,
      t.currency,
      t.account?.name || 'N/A'
    ])

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dateString = `${year}-${month}-${day}`
    a.download = `transactions_${dateString}.csv`
    a.click()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">거래 내역</h2>
          <p className="text-slate-600 text-sm mt-1">총 {transactions.length}개의 거래</p>
        </div>
        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
        >
          <Download className="w-5 h-5" />
          <span>CSV 다운로드</span>
        </button>
      </div>

      {/* Summary Cards */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">총 수입</p>
              <ArrowDownLeft className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              +{Math.round(totalIncome).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">총 지출</p>
              <ArrowUpRight className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600">
              -{Math.round(totalExpense).toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">순 변화</p>
              <div className={`w-5 h-5 ${totalIncome - totalExpense >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                {totalIncome - totalExpense >= 0 ? (
                  <ArrowDownLeft className="w-5 h-5" />
                ) : (
                  <ArrowUpRight className="w-5 h-5" />
                )}
              </div>
            </div>
            <p className={`text-2xl font-bold ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {Math.round(totalIncome - totalExpense).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">정렬 및 필터</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-slate-700 mb-2">
              정렬
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 appearance-none pr-8"
            >
              <option value="date">최신순</option>
              <option value="amount">금액순</option>
            </select>
          </div>
          <div>
            <label htmlFor="filterType" className="block text-sm font-medium text-slate-700 mb-2">
              유형 필터
            </label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense')}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white text-slate-900 appearance-none pr-8"
            >
              <option value="all">모두</option>
              <option value="income">수입만</option>
              <option value="expense">지출만</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      {sortedTransactions.length > 0 ? (
        <div className="space-y-3">
          {sortedTransactions.map((transaction: Transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-all duration-200 flex items-center justify-between"
            >
              <div className="flex items-center space-x-4 flex-1">
                {/* Icon */}
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  transaction.amount > 0 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  {transaction.amount > 0 ? (
                    <ArrowDownLeft className={`w-5 h-5 text-green-600`} />
                  ) : (
                    <ArrowUpRight className={`w-5 h-5 text-red-600`} />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {transaction.description}
                  </p>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                    <span>{new Date(transaction.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{transaction.type}</span>
                    {transaction.account && (
                      <>
                        <span>•</span>
                        <span>{transaction.account.name}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={`text-lg font-bold ${
                  transaction.amount > 0 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : '-'}
                  {Math.abs(transaction.amount).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {transaction.currency}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
          <ArrowUpRight className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">거래 내역이 없습니다.</p>
        </div>
      )}
    </div>
  )
}

export default TransactionList
