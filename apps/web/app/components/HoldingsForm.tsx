'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface HoldingFormData {
  accountId: string;
  symbol: string;
  shares: number | string;
  costBasis: number | string;
  currency: string;
}

const createHolding = async (holdingData: HoldingFormData) => {
  const res = await fetch('/api/holdings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...holdingData,
      shares: Number(holdingData.shares),
      costBasis: Number(holdingData.costBasis),
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create holding');
  }
  return res.json()
}

const HoldingsForm = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<HoldingFormData>({
    accountId: '',
    symbol: '',
    shares: '',
    costBasis: '',
    currency: '',
  })

  const mutation = useMutation<any, Error, HoldingFormData>({ // Explicitly type mutation
    mutationFn: createHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['holdings'] })
      setFormData({ accountId: '', symbol: '', shares: '', costBasis: '', currency: '' }) // Clear form
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.accountId || !formData.symbol || !formData.shares || !formData.costBasis || !formData.currency) {
      alert('Please fill in all fields')
      return
    }
    if (isNaN(Number(formData.shares)) || isNaN(Number(formData.costBasis))) {
      alert('Shares and Cost Basis must be numbers.')
      return;
    }
    mutation.mutate(formData)
  }

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2">Add New Holding</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">Account ID (Placeholder)</label>
          <input
            type="text"
            name="accountId"
            id="accountId"
            value={formData.accountId}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">Symbol</label>
          <input
            type="text"
            name="symbol"
            id="symbol"
            value={formData.symbol}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="shares" className="block text-sm font-medium text-gray-700">Shares</label>
          <input
            type="number"
            name="shares"
            id="shares"
            value={formData.shares}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="costBasis" className="block text-sm font-medium text-gray-700">Cost Basis</label>
          <input
            type="number"
            name="costBasis"
            id="costBasis"
            value={formData.costBasis}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
          />
        </div>
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Adding...' : 'Add Holding'}
        </button>
        {mutation.isError && <p className="text-red-500">Error: {mutation.error.message}</p>}
        {mutation.isSuccess && <p className="text-green-500">Holding added successfully!</p>}
      </form>
    </div>
  )
}

export default HoldingsForm