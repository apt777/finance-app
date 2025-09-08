'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAccounts } from '../hooks/useAccounts' // Import the useAccounts hook

interface TransactionFormData {
  accountId: string;
  date: string;
  description: string;
  type: string; // Added type field
  amount: number | string; // Allow string for input value
  currency: string;
}

const createTransaction = async (transactionData: TransactionFormData) => {
  const res = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...transactionData,
      amount: Number(transactionData.amount), // Convert to number before sending
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create transaction');
  }
  return res.json()
}

const TransactionForm = () => {
  const queryClient = useQueryClient()
  const { data: accounts, isLoading: isLoadingAccounts, error: accountsError } = useAccounts()
  const [formData, setFormData] = useState<TransactionFormData>({
    accountId: '',
    date: '',
    description: '',
    type: '', // Added type to initial state
    amount: '',
    currency: '',
  })

  const mutation = useMutation<any, Error, TransactionFormData>({ // Explicitly type mutation
    mutationFn: createTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Invalidate accounts query on new transaction
      setFormData({ accountId: '', date: '', description: '', type: '', amount: '', currency: '' }) // Clear form
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Basic validation
    if (!formData.accountId || !formData.date || !formData.description || !formData.type || !formData.amount || !formData.currency) {
      alert('Please fill in all fields')
      return
    }
    if (isNaN(Number(formData.amount))) {
      alert('Amount must be a number.')
      return;
    }
    mutation.mutate(formData)
  }

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2">Add New Transaction</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">Account</label>
          <select
            name="accountId"
            id="accountId"
            value={formData.accountId}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            disabled={isLoadingAccounts}
            required
          >
            <option value="" disabled>Select an Account</option>
            {accountsError && <option value="" disabled>Error loading accounts</option>}
            {!accountsError && accounts?.map(account => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.balance.toFixed(2)} {account.currency})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">Date</label>
          <input
            type="date"
            name="date"
            id="date"
            value={formData.date}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Description</label>
          <input
            type="text"
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">Type</label>
          <select
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          >
            <option value="" disabled>Select Type</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount</label>
          <input
            type="number"
            name="amount"
            id="amount"
            value={formData.amount}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">Currency</label>
          <input
            type="text"
            name="currency"
            id="currency"
            value={formData.currency}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          disabled={mutation.isPending || isLoadingAccounts}
        >
          {mutation.isPending ? 'Adding...' : 'Add Transaction'}
        </button>
        {mutation.isError && <p className="text-red-500">Error: {mutation.error.message}</p>}
        {mutation.isSuccess && <p className="text-green-500">Transaction added successfully!</p>}
      </form>
    </div>
  )
}

export default TransactionForm
