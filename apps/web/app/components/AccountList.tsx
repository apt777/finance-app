'use client'

import React, { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import Link from 'next/link'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Edit2, Plus, Wallet, CreditCard, PiggyBank, TrendingUp, Filter } from 'lucide-react'

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

const AccountList = () => {
  const queryClient = useQueryClient()
  const { data, error, isLoading } = useAccounts()
  const [filterCurrency, setFilterCurrency] = useState('')
  const [filterType, setFilterType] = useState('')

  // Mutation for deleting an account
  const deleteAccountMutation = useMutation<any, Error, string>({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || '계좌 삭제 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
    },
  })

  const handleDelete = (accountId: string, accountName: string) => {
    if (confirm(`"${accountName}" 계좌를 정말 삭제하시겠습니까?\n이 계좌에 연결된 모든 거래 내역과 투자 정보도 함께 삭제됩니다.`)) {
      deleteAccountMutation.mutate(accountId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">계좌 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">계좌 정보를 불러오는 중 오류 발생</p>
      </div>
    )
  }

  const accounts: Account[] = (data as Account[]) || []

  const filteredAccounts = accounts.filter((account: Account) => {
    return (
      (filterCurrency === '' || account.currency === filterCurrency) &&
      (filterType === '' || account.type === filterType)
    )
  })

  const uniqueCurrencies: string[] = [...new Set(accounts.map((account: Account) => account.currency))]
  const uniqueTypes: string[] = [...new Set(accounts.map((account: Account) => account.type))]

  // Account type icons
  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return <Wallet className="w-5 h-5" />
      case 'savings':
        return <PiggyBank className="w-5 h-5" />
      case 'credit_card':
        return <CreditCard className="w-5 h-5" />
      case 'investment':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Wallet className="w-5 h-5" />
    }
  }

  // Account type labels
  const getAccountTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'checking': '당좌예금',
      'savings': '저축',
      'credit_card': '신용카드',
      'investment': '투자',
    }
    return labels[type] || type
  }

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    const symbols: { [key: string]: string } = {
      'JPY': '¥',
      'KRW': '₩',
      'USD': '$',
    }
    return symbols[currency] || currency
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">계좌 관리</h2>
          <p className="text-slate-600 text-sm mt-1">총 {accounts.length}개의 계좌</p>
        </div>
        <Link
          href="/accounts/add"
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>새 계좌 추가</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">필터</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="currencyFilter" className="block text-sm font-medium text-slate-700 mb-2">
              통화별 필터
            </label>
            <select
              id="currencyFilter"
              value={filterCurrency}
              onChange={(e) => setFilterCurrency(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">모든 통화</option>
              {uniqueCurrencies.map((currency: string) => (
                <option key={currency} value={currency}>
                  {currency} ({getCurrencySymbol(currency)})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="typeFilter" className="block text-sm font-medium text-slate-700 mb-2">
              계좌 종류별 필터
            </label>
            <select
              id="typeFilter"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">모든 종류</option>
              {uniqueTypes.map((type: string) => (
                <option key={type} value={type}>
                  {getAccountTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Accounts Grid */}
      {filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAccounts.map((account: Account) => (
            <div
              key={account.id}
              className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 card-hover"
            >
              {/* Account Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
                    {getAccountIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{account.name}</h3>
                    <p className="text-xs text-slate-500">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    href={`/accounts/${account.id}/transactions`}
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                    title="거래 내역 보기"
                  >
                    <Edit2 className="w-4 h-4 text-slate-600" />
                  </Link>
                  <button
                    onClick={() => handleDelete(account.id, account.name)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    disabled={deleteAccountMutation.isPending}
                    title="계좌 삭제"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Account Balance */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-600 mb-1">잔액</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold text-slate-800">
                    {Math.round(account.balance).toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    {getCurrencySymbol(account.currency)} {account.currency}
                  </span>
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">계좌 종류</span>
                  <span className="font-medium text-slate-800">{getAccountTypeLabel(account.type)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">통화</span>
                  <span className="font-medium text-slate-800">{account.currency}</span>
                </div>
              </div>

              {/* Action Link */}
              <Link
                href={`/accounts/${account.id}/transactions`}
                className="mt-4 w-full py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors text-center text-sm"
              >
                거래 내역 보기
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
          <Wallet className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium mb-4">필터와 일치하는 계좌가 없습니다.</p>
          <Link
            href="/accounts/add"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>첫 계좌 추가하기</span>
          </Link>
        </div>
      )}

      {/* Error Messages */}
      {deleteAccountMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
          <p className="font-medium">계좌 삭제 오류</p>
          <p className="text-xs mt-1">{deleteAccountMutation.error.message}</p>
        </div>
      )}

      {deleteAccountMutation.isSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-green-600 text-sm">
          <p className="font-medium">계좌가 성공적으로 삭제되었습니다!</p>
        </div>
      )}
    </div>
  )
}

export default AccountList
