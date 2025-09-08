'use client'

import React, { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import Link from 'next/link'

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

const AccountList = () => {
  const { data, error, isLoading } = useAccounts()
  const [filterCurrency, setFilterCurrency] = useState('')
  const [filterType, setFilterType] = useState('')

  if (isLoading) return <div>Loading accounts...</div>
  if (error) return <div>Error fetching accounts</div>

  const accounts: Account[] = (data as Account[]) || []

  const filteredAccounts = accounts.filter((account: Account) => {
    return (
      (filterCurrency === '' || account.currency === filterCurrency) &&
      (filterType === '' || account.type === filterType)
    )
  })

  const uniqueCurrencies: string[] = [...new Set(accounts.map((account: Account) => account.currency))]
  const uniqueTypes: string[] = [...new Set(accounts.map((account: Account) => account.type))]

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Account List</h2>

      <div className="flex space-x-4 mb-4">
        <div>
          <label htmlFor="currencyFilter" className="block text-sm font-medium text-gray-700">Filter by Currency</label>
          <select
            id="currencyFilter"
            value={filterCurrency}
            onChange={(e) => setFilterCurrency(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">All Currencies</option>
            {uniqueCurrencies.map((currency: string) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="typeFilter" className="block text-sm font-medium text-gray-700">Filter by Type</label>
          <select
            id="typeFilter"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="">All Types</option>
            {uniqueTypes.map((type: string) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredAccounts.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAccounts.map((account: Account) => (
              <tr key={account.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.type}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.balance.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No accounts found matching your filters.</p>
      )}

      <Link href="/accounts/add" className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Add New Account
      </Link>
    </div>
  )
}

export default AccountList