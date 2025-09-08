'use client'

import React from 'react'
import { useOverviewData } from '../hooks/useOverviewData'
import { useExchangeRates } from '../hooks/useExchangeRates'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Link from 'next/link'

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
  date: string; // Assuming date is string from API
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
  targetDate?: string; // Assuming date is string from API
}

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
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

  if (isLoading || ratesLoading) return <div>Loading overview data...</div>
  if (isError || ratesError) return <div>Error loading overview data</div>

  // Type assertions for data from hooks
  const overviewData: OverviewData = data as OverviewData;
  const accounts: Account[] = overviewData.accounts || []
  const holdings: Holding[] = overviewData.holdings || []
  const goals: Goal[] = overviewData.goals || []
  const transactions: Transaction[] = overviewData.transactions || []

  const rates: ExchangeRate[] = (exchangeRates as ExchangeRate[]) || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = rates.find((r) => r.from === currency && r.to === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  // Calculate total balance per currency
  const totalBalanceByCurrency: { [key: string]: number } = accounts.reduce((acc: { [key: string]: number }, account: Account) => {
    acc[account.currency] = (acc[account.currency] || 0) + account.balance
    return acc
  }, {})

  // Calculate net worth
  let netWorth = 0
  accounts.forEach((account: Account) => {
    netWorth += convertToBaseCurrency(account.balance, account.currency)
  })
  holdings.forEach((holding: Holding) => {
    netWorth += convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency)
  })

  // Calculate goal progress percentage
  const goalsWithProgress = goals.map((goal: Goal) => ({
    ...goal,
    progress: (goal.currentAmount / goal.targetAmount) * 100,
  }))

  // Prepare data for Last 30 Days Chart (expenses)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const expensesLast30Days: { [key: string]: number } = transactions
    .filter((t: Transaction) => new Date(t.date) >= thirtyDaysAgo && t.amount < 0)
    .reduce((acc: { [key: string]: number }, t: Transaction) => {
      const date = new Date(t.date).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + convertToBaseCurrency(Math.abs(t.amount), t.currency)
      return acc
    }, {})

  const chartData: ChartData[] = Object.keys(expensesLast30Days).map((date) => ({
    date,
    expenses: expensesLast30Days[date],
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())


  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Overview</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">Net Worth</h3>
          <p className="text-2xl font-bold">{netWorth.toFixed(2)} {BASE_CURRENCY}</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">Accounts Summary</h3>
          <p>Total Accounts: {accounts.length}</p>
          <ul>
            {Object.entries(totalBalanceByCurrency).map(([currency, balance]) => (
              <li key={currency}>
                {currency}: {balance.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">Holdings Summary</h3>
          <p>Total Holdings: {holdings.length}</p>
          {/* More detailed holdings summary here */}
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="text-xl font-semibold mb-2">Goals Summary</h3>
          <p>Total Goals: {goals.length}</p>
          <ul>
            {goalsWithProgress.map((goal) => (
              <li key={goal.id}>
                {goal.name}: {goal.progress.toFixed(2)}%
              </li>
            ))}
          </ul>
        </div>
        {/* Last 30 Days Chart for expenses */}
        <div className="bg-white p-4 rounded shadow col-span-full">
          <h3 className="text-xl font-semibold mb-2">Last 30 Days Expenses ({BASE_CURRENCY})</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="expenses" stroke="#8884d8" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>No expenses recorded in the last 30 days.</p>
          )}
        </div>
        {/* Quick Action Buttons */}
        <div className="bg-white p-4 rounded shadow col-span-full">
          <h3 className="text-xl font-semibold mb-2">Quick Actions</h3>
          <div className="flex space-x-4">
            <Link href="/transactions/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Add Transaction
            </Link>
            <Link href="/accounts/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Add Account
            </Link>
            <Link href="/holdings/add" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Add Holding
            </Link>
          </div>
        </div>
        {/* Placeholder for Basic Analysis */}
        <div className="bg-white p-4 rounded shadow col-span-full">
          <h3 className="text-xl font-semibold mb-2">Basic Analysis (Placeholder)</h3>
          <p>
            This section would include insights like auto-suggested savings categories,
            highlighting highest expense categories,
            and more detailed goal completion metrics.
            (Requires transaction categorization and more sophisticated data processing.)
          </p>
          <p>Total Transactions for Analysis: {transactions.length}</p>
        </div>
      </div>
    </div>
  )
}

export default Overview