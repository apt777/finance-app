'use client'

import React, { useState } from 'react'
import { useTransactions } from '@/hooks/useTransactions'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowUpRight, ArrowDownLeft, Filter, Download, Calendar, Search, Trash2, X, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'

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
  fromAccount?: {
    name: string;
    currency: string;
  };
  toAccount?: {
    name: string;
    currency: string;
  };
}

const TransactionList = ({ accountId }: { accountId?: string }) => {
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')
  const { data, error, isLoading } = useTransactions(accountId)
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date')
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense' | 'transfer'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  const queryClient = useQueryClient()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isEditMode, setIsEditMode] = useState(false)

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(sortedTransactions.map(t => t.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id))
    } else {
      setSelectedIds([...selectedIds, id])
    }
  }

  const deleteTransactionsMutation = useMutation<any, Error, string[]>({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error(tCommon('error'))
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setSelectedIds([])
      setIsEditMode(false)
    },
  })

  const handleDeleteSelected = () => {
    if (confirm(`${selectedIds.length}: ${tCommon('delete')}?`)) {
      deleteTransactionsMutation.mutate(selectedIds)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{tCommon('error')}</p>
      </div>
    )
  }

  const transactions: Transaction[] = (data as Transaction[]) || []

  // Filter transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchesType = filterType === 'all' || t.type === filterType
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         (t.account?.name || t.fromAccount?.name || t.toAccount?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    return matchesType && matchesSearch
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
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0)

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [tTransactions('date'), tTransactions('description'), tTransactions('type'), tTransactions('amount'), tTransactions('account')]
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
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{tTransactions('title')}</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">{tTransactions('totalTransactions')}: {transactions.length}</p>
        </div>
        <div className="flex items-center gap-2">
          {isEditMode ? (
            <>
              <button
                onClick={() => { setIsEditMode(false); setSelectedIds([]); }}
                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                title={tCommon('cancel')}
              >
                <X className="w-5 h-5" />
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all animate-in zoom-in duration-200"
                  title={tCommon('delete')}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <>
              <button
                onClick={handleExportCSV}
                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                title={tTransactions('exportCSV')}
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsEditMode(true)}
                className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all"
                title={tCommon('delete')}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </>
          )}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-slate-200 text-slate-600'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards - Horizontal scroll on mobile */}
      {transactions.length > 0 && (
        <div className="flex overflow-x-auto pb-2 gap-4 snap-x no-scrollbar -mx-1 px-1">
          <div className="min-w-[160px] flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 snap-start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tTransactions('totalIncome')}</p>
              <ArrowDownLeft className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-lg font-black text-emerald-600">
              +{Math.round(totalIncome).toLocaleString()}
            </p>
          </div>
          <div className="min-w-[160px] flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 snap-start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tTransactions('totalExpense')}</p>
              <ArrowUpRight className="w-4 h-4 text-rose-500" />
            </div>
            <p className="text-lg font-black text-rose-600">
              -{Math.round(totalExpense).toLocaleString()}
            </p>
          </div>
          <div className="min-w-[160px] flex-1 bg-white rounded-2xl p-4 shadow-sm border border-slate-100 snap-start">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{tTransactions('netChange')}</p>
              <div className={`w-4 h-4 ${totalIncome - totalExpense >= 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                {totalIncome - totalExpense >= 0 ? <ArrowDownLeft /> : <ArrowUpRight />}
              </div>
            </div>
            <p className={`text-lg font-black ${totalIncome - totalExpense >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
              {Math.round(totalIncome - totalExpense).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {showFilters && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 ml-1">{tTransactions('sortBy')}</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'amount')}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="date">{tTransactions('latest')}</option>
                <option value="amount">{tTransactions('byAmount')}</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 ml-1">{tTransactions('filterBy')}</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as 'all' | 'income' | 'expense' | 'transfer')}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="all">{tTransactions('all')}</option>
                <option value="income">{tTransactions('incomeOnly')}</option>
                <option value="expense">{tTransactions('expenseOnly')}</option>
                <option value="transfer">Transfer</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      {sortedTransactions.length > 0 ? (
        <div className="space-y-2">
          {isEditMode && (
            <div className="flex items-center px-4 py-2 animate-in slide-in-from-left duration-200">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedIds.length === sortedTransactions.length && sortedTransactions.length > 0}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <label htmlFor="select-all" className="ml-3 text-xs text-slate-500 font-medium cursor-pointer">
                Select All ({selectedIds.length})
              </label>
            </div>
          )}

          {sortedTransactions.map((transaction: Transaction) => (
            <div
              key={transaction.id}
              className={`bg-white rounded-2xl p-4 shadow-sm border transition-all duration-200 flex items-center justify-between group ${
                isEditMode && selectedIds.includes(transaction.id) ? 'border-blue-300 bg-blue-50/30' : 'border-slate-100 hover:border-blue-100'
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {isEditMode && (
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(transaction.id)}
                    onChange={() => handleSelectOne(transaction.id)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer mr-2 animate-in zoom-in duration-200"
                  />
                )}
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  transaction.type === 'income' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : transaction.type === 'transfer'
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-rose-50 text-rose-600'
                }`}>
                  {transaction.type === 'income' ? (
                    <ArrowDownLeft className="w-5 h-5" />
                  ) : transaction.type === 'transfer' ? (
                    <ArrowRight className="w-5 h-5" />
                  ) : (
                    <ArrowUpRight className="w-5 h-5" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm md:text-base truncate group-hover:text-blue-600 transition-colors">
                    {transaction.description}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] md:text-xs text-slate-400 mt-0.5">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>
                    <span>•</span>
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                      {transaction.type === 'income' ? 'Income' : transaction.type === 'expense' ? 'Expense' : 'Transfer'}
                    </span>
                    
                    {transaction.type === 'transfer' ? (
                      <>
                        <span>•</span>
                        <span className="truncate max-w-[60px]">{transaction.fromAccount?.name}</span>
                        <ArrowRight className="w-3 h-3 mx-0.5" />
                        <span className="truncate max-w-[60px]">{transaction.toAccount?.name}</span>
                      </>
                    ) : (
                      transaction.account && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[80px]">{transaction.account.name}</span>
                        </>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right ml-3">
                <p className={`text-base md:text-lg font-black ${
                  transaction.type === 'income' 
                    ? 'text-emerald-600' 
                    : transaction.type === 'transfer'
                    ? 'text-blue-600'
                    : 'text-rose-600'
                }`}>
                  {transaction.type === 'income' ? '+' : transaction.type === 'transfer' ? '' : '-'}
                  {Math.abs(transaction.amount).toLocaleString()}
                </p>
                <p className="text-[10px] font-bold text-slate-400">
                  {transaction.currency}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-slate-200" />
          </div>
          <p className="text-slate-500 font-medium">{tTransactions('noTransactions')}</p>
        </div>
      )}
    </div>
  )
}

export default TransactionList
