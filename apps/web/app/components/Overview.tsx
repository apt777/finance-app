'use client'

import React from 'react'
import { useOverviewData } from '@/hooks/useOverviewData'
import { useExchangeRates, ExchangeRate } from '@/hooks/useExchangeRates'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'

// Define interfaces for data structures
interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
}

interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
}

interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

interface OverviewData {
  accounts: Account[];
  transactions: Transaction[];
  holdings: Holding[];
  goals: Goal[];
}

interface ChartData {
  date: string;
  expenses: number;
}

const Overview = () => {
  const { data, isLoading, isError } = useOverviewData()
  const { data: exchangeRates, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  if (isLoading || ratesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">개요 데이터 로딩 중...</p>
        </div>
      </div>
    )
  }
  
  if (isError || ratesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">개요 데이터 로딩 중 오류 발생</p>
      </div>
    )
  }

  // Type assertions for data from hooks
  const overviewData: OverviewData = (data as OverviewData) || { accounts: [], transactions: [], holdings: [], goals: [] };
  const accounts: Account[] = overviewData.accounts || []
  const holdings: Holding[] = overviewData.holdings || []
  const transactions: Transaction[] = overviewData.transactions || []

  const rates: ExchangeRate[] = exchangeRates || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((r) => r.fromCurrency === currency && r.toCurrency === BASE_CURRENCY)?.rate
    return rate ? amount * rate : 0
  }

  // Calculate total balance per currency (for Accounts Summary card)
  const totalBalanceByCurrency: { [key: string]: number } = accounts.reduce((acc: { [key: string]: number }, account: Account) => {
    acc[account.currency] = (acc[account.currency] || 0) + account.balance
    return acc
  }, {});

  // Calculate total balance per currency (excluding credit cards for country totals)
  const totalNonCreditBalancesByCurrency: { [key: string]: number } = {};
  accounts.forEach(account => {
      if (account.type !== 'credit_card') {
          totalNonCreditBalancesByCurrency[account.currency] = (totalNonCreditBalancesByCurrency[account.currency] || 0) + account.balance;
      }
  });

  const japaneseAccountsTotal = totalNonCreditBalancesByCurrency['JPY'] || 0;
  const koreanAccountsTotal = totalNonCreditBalancesByCurrency['KRW'] || 0;

  // Calculate credit card liabilities grouped by currency
  const creditLiabilities = new Map<string, number>();
  accounts.forEach((account) => {
    if (account.type === 'credit_card' && account.balance > 0) {
      const currentLiability = creditLiabilities.get(account.currency) || 0;
      creditLiabilities.set(account.currency, currentLiability + account.balance);
    }
  });

  // Calculate total positive assets
  let totalPositiveAssetsBaseCurrency = 0;
  for (const currency in totalNonCreditBalancesByCurrency) {
      const balance = totalNonCreditBalancesByCurrency[currency];
      if (balance !== undefined) {
        totalPositiveAssetsBaseCurrency += convertToBaseCurrency(balance, currency);
      }
  }

  // Calculate total positive assets in KRW
  const rateJPYToKRW = rates.find(r => r.fromCurrency === 'JPY' && r.toCurrency === 'KRW')?.rate || 0;
  const totalPositiveAssetsKRW = totalPositiveAssetsBaseCurrency * rateJPYToKRW;

  // Prepare data for Last 30 Days Chart
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const expensesLast30Days: { [key: string]: number } = transactions
    .filter((t: Transaction) => t.date && new Date(t.date) >= thirtyDaysAgo && t.amount < 0)
    .reduce((acc: { [key: string]: number }, t: Transaction) => {
      const date = new Date(t.date).toISOString().split('T')[0]
      if (date) {
        acc[date] = (acc[date] || 0) + convertToBaseCurrency(Math.abs(t.amount), t.currency)
      }
      return acc
    }, {})

  const chartData: ChartData[] = Object.keys(expensesLast30Days).map((date) => ({
    date,
    expenses: Math.round(expensesLast30Days[date] || 0),
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Assets Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 card-hover">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6" />
            </div>
            <TrendingUp className="w-5 h-5 text-white/70" />
          </div>
          <p className="text-sm text-white/80 mb-1">총자산 (JPY)</p>
          <p className="text-3xl font-bold">{Math.round(totalPositiveAssetsBaseCurrency).toLocaleString()}</p>
          <p className="text-xs text-white/70 mt-2">≈ {Math.round(totalPositiveAssetsKRW).toLocaleString()} KRW</p>
        </div>

        {/* Japanese Accounts Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 card-hover border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">¥</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">일본 계좌</p>
          <p className="text-2xl font-bold text-slate-800">{Math.round(japaneseAccountsTotal).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">JPY</p>
          {creditLiabilities.has('JPY') && (
            <p className="text-sm text-red-500 font-semibold mt-2">
              부채: -{Math.round(creditLiabilities.get('JPY') || 0).toLocaleString()}
            </p>
          )}
        </div>

        {/* Korean Accounts Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 card-hover border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white text-lg font-bold">₩</span>
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">한국 계좌</p>
          <p className="text-2xl font-bold text-slate-800">{Math.round(koreanAccountsTotal).toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">KRW</p>
          {creditLiabilities.has('KRW') && (
            <p className="text-sm text-red-500 font-semibold mt-2">
              부채: -{Math.round(creditLiabilities.get('KRW') || 0).toLocaleString()}
            </p>
          )}
        </div>

        {/* Accounts Summary Card */}
        <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-200 card-hover border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-white" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mb-1">총 계좌</p>
          <p className="text-3xl font-bold text-slate-800">{accounts.length}</p>
          <div className="mt-3 space-y-1">
            {Object.entries(totalBalanceByCurrency).slice(0, 2).map(([currency, balance]) => (
              <p key={currency} className="text-xs text-slate-500">
                {currency}: {Math.round(balance).toLocaleString()}
              </p>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Chart */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">최근 30일 지출</h3>
              <p className="text-sm text-slate-500 mt-1">단위: {BASE_CURRENCY}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' 
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-slate-400">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Overview
