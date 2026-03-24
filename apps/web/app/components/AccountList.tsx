'use client'

import React, { useState } from 'react'
import { useAccounts } from '@/hooks/useAccounts'
import { Link } from '@/navigation'
import { useRouter } from '@/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, Wallet, CreditCard, PiggyBank, TrendingUp, Filter, ChevronRight, Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useUiTheme } from '@/context/UiThemeContext'
import AppLoadingState from '@/components/AppLoadingState'

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

const AccountList = () => {
  const { theme } = useUiTheme()
  const tAccounts = useTranslations('accounts')
  const tCommon = useTranslations('common')
  const router = useRouter()
  const queryClient = useQueryClient()
  const { data, error, isLoading } = useAccounts()
  const [filterCurrency, setFilterCurrency] = useState('')
  const [filterType, setFilterType] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Mutation for deleting an account
  const deleteAccountMutation = useMutation<any, Error, string>({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || tAccounts('deleteError'))
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
    },
  })

  const handleDelete = (e: React.MouseEvent, accountId: string, accountName: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`"${accountName}": ${tAccounts('deleteConfirm')}\n${tAccounts('deleteWarning')}`)) {
      deleteAccountMutation.mutate(accountId)
    }
  }

  if (isLoading) {
    return <AppLoadingState label={tAccounts('title')} />
  }

  const accounts: Account[] = (data as Account[]) || []

  if (error && accounts.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{tCommon('error')}</p>
      </div>
    )
  }

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
    switch (type) {
      case 'checking':
        return tAccounts('checking')
      case 'savings':
        return tAccounts('savings')
      case 'credit_card':
        return tAccounts('creditCard')
      case 'investment':
        return tAccounts('investment')
      default:
        return type
    }
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
    <div className={`space-y-4 pb-24 md:space-y-6 md:pb-8 ${theme === 'modern' ? 'rounded-[34px] border border-white/80 bg-white/55 p-4 shadow-[0_18px_50px_rgba(148,163,184,0.12)] backdrop-blur-xl md:p-6' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{tAccounts('title')}</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">{tAccounts('totalAccounts')}: {accounts.length}</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-xl border p-2 transition-all ${showFilters ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-600'}`}
          >
            <Filter className="w-5 h-5" />
          </button>
          <Link
            href="/accounts/add"
            className={`flex h-10 w-10 items-center justify-center rounded-xl font-semibold text-white transition-all md:h-auto md:w-auto md:px-4 md:py-2 ${theme === 'modern' ? 'bg-slate-950 shadow-lg hover:bg-slate-800' : 'bg-blue-600 shadow-md hover:bg-blue-700'}`}
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline ml-2">{tAccounts('addNewAccount')}</span>
          </Link>
        </div>
      </div>

      {/* Filters - Collapsible on mobile */}
      {showFilters && (
        <div className={`animate-in fade-in slide-in-from-top-2 rounded-2xl p-4 duration-200 ${theme === 'modern' ? 'border border-white/80 bg-white shadow-[0_10px_30px_rgba(148,163,184,0.14)]' : 'border border-slate-100 bg-white shadow-sm'}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 ml-1">
                {tAccounts('currencyFilter')}
              </label>
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-slate-700"
              >
                <option value="">{tAccounts('allCurrencies')}</option>
                {uniqueCurrencies.map((currency: string) => (
                  <option key={currency} value={currency}>
                    {currency} ({getCurrencySymbol(currency)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5 ml-1">
                {tAccounts('typeFilter')}
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm text-slate-700"
              >
                <option value="">{tAccounts('allTypes')}</option>
                {uniqueTypes.map((type: string) => (
                  <option key={type} value={type}>
                    {getAccountTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Accounts List/Grid */}
      {filteredAccounts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAccounts.map((account: Account) => (
            <div
              key={account.id}
              onClick={() => router.push(`/accounts/${account.id}/transactions`)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border p-4 transition-all duration-200 ${theme === 'modern' ? 'border-white/80 bg-white shadow-[0_14px_34px_rgba(148,163,184,0.14)] hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_40px_rgba(148,163,184,0.18)]' : 'border-slate-100 bg-white shadow-sm hover:border-blue-200 hover:shadow-md'}`}
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                    {getAccountIcon(account.type)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm md:text-base">{account.name}</h3>
                    <p className="text-[10px] md:text-xs text-slate-500">{getAccountTypeLabel(account.type)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(`/accounts/${account.id}/edit`)
                    }}
                    className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, account.id, account.name)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between relative z-10">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider font-bold mb-0.5 ${
                    account.type === 'credit_card' ? 'text-rose-400' : 'text-slate-400'
                  }`}>
                    {account.type === 'credit_card' ? tCommon('liability') : tAccounts('balance')}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-lg md:text-xl font-black ${
                      account.type === 'credit_card' ? 'text-rose-600' : 'text-slate-900'
                    }`}>
                      {Math.round(account.balance).toLocaleString()}
                    </span>
                    <span className={`text-xs font-bold ${
                      account.type === 'credit_card' ? 'text-rose-500' : 'text-slate-500'
                    }`}>
                      {account.currency}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded-lg">
                  {getCurrencySymbol(account.currency)}
                </div>
              </div>
              
              {account.type === 'credit_card' && account.balance > 0 && (
                <div className="mt-3 relative z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/transactions/add?type=transfer&toAccountId=${account.id}&amount=${account.balance}`);
                    }}
                    className="flex items-center justify-center w-full py-2 bg-rose-100 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-200 transition-colors"
                  >
                    {tCommon('repay')}
                  </button>
                </div>
              )}
              
              {/* Decorative background element */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-slate-50 rounded-full opacity-50 group-hover:bg-blue-50 transition-colors z-0"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm mb-6">{tAccounts('noAccounts')}</p>
          <Link
            href="/accounts/add"
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span>{tAccounts('addNewAccount')}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default AccountList
