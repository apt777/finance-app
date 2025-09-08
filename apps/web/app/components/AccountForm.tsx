'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

// userId is no longer needed from the form
interface AccountFormData {
  name: string;
  type: string;
  balance: number | string;
  currency: string;
}

const createAccount = async (accountData: Omit<AccountFormData, 'userId'>) => {
  const res = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...accountData,
      balance: Number(accountData.balance),
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create account');
  }
  return res.json()
}

const AccountForm = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<AccountFormData>({
    name: '',
    type: '',
    balance: '',
    currency: '',
  })

  const mutation = useMutation<any, Error, AccountFormData>({ // Explicitly type mutation
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setFormData({ name: '', type: '', balance: '', currency: '' }) // Clear form
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.type || !formData.balance || !formData.currency) {
      alert('Please fill in all fields')
      return
    }
    if (isNaN(Number(formData.balance))) {
      alert('Balance must be a number.')
      return;
    }
    mutation.mutate(formData)
  }

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2">Add New Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* User ID input is removed */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Account Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700">Account Type</label>
          <input
            type="text"
            name="type"
            id="type"
            value={formData.type}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            required
          />
        </div>
        <div>
          <label htmlFor="balance" className="block text-sm font-medium text-gray-700">Balance</label>
          <input
            type="number"
            name="balance"
            id="balance"
            value={formData.balance}
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
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Adding...' : 'Add Account'}
        </button>
        {mutation.isError && <p className="text-red-500">Error: {mutation.error.message}</p>}
        {mutation.isSuccess && <p className="text-green-500">Account added successfully!</p>}
      </form>
    </div>
  )
}

export default AccountForm
