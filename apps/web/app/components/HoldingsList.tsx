'use client'

import React, { useState } from 'react'
import { useHoldings } from '../hooks/useHoldings'
import { useAccounts } from '../hooks/useAccounts'
import { useExchangeRates } from '../hooks/useExchangeRates'

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
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

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

const HoldingsList = () => {
  const { data: holdingsData, error: holdingsError, isLoading: holdingsLoading } = useHoldings()
  const { data: accountsData, error: accountsError, isLoading: accountsLoading } = useAccounts()
  const { data: exchangeRatesData, isLoading: ratesLoading, isError: ratesError } = useExchangeRates()

  const [filterAccount, setFilterAccount] = useState('')

  if (holdingsLoading || accountsLoading || ratesLoading) return <div>Loading holdings...</div>
  if (holdingsError || accountsError || ratesError) return <div>Error fetching data</div>

  const holdings: Holding[] = (holdingsData as Holding[]) || []
  const accounts: Account[] = (accountsData as Account[]) || []
  const exchangeRates: ExchangeRate[] = (exchangeRatesData as ExchangeRate[]) || []

  const BASE_CURRENCY = 'JPY'

  const convertToBaseCurrency = (amount: number, currency: string): number => {
    if (currency === BASE_CURRENCY) return amount
    const rate = exchangeRates.find((r) => r.from === currency && r.to === BASE_CURRENCY)?.rate
    return rate ? amount * rate : amount
  }

  const accountMap = new Map<string, string>(accounts.map((account: Account) => [account.id, account.name]))

  const filteredHoldings = holdings.filter((holding: Holding) => {
    return filterAccount === '' || holding.accountId === filterAccount
  })

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Holdings List</h2>

      <div className="mb-4">
        <label htmlFor="accountFilter" className="block text-sm font-medium text-gray-700">Filter by Account</label>
        <select
          id="accountFilter"
          value={filterAccount}
          onChange={(e) => setFilterAccount(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="">All Accounts</option>
          {accounts.map((account: Account) => (
            <option key={account.id} value={account.id}>{account.name}</option>
          ))}
        </select>
      </div>

      {filteredHoldings.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Basis</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value ({BASE_CURRENCY})</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredHoldings.map((holding: Holding) => (
              <tr key={holding.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{holding.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{accountMap.get(holding.accountId)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holding.shares}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{holding.costBasis.toFixed(2)} {holding.currency}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {convertToBaseCurrency(holding.shares * holding.costBasis, holding.currency).toFixed(2)} {BASE_CURRENCY}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No holdings found.</p>
      )}
    </div>
  )
}

export default HoldingsList