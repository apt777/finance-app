'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

interface GoalFormData {
  userId: string;
  name: string;
  targetAmount: number | string;
  currentAmount: number | string;
  targetDate: string;
}

const createGoal = async (goalData: GoalFormData) => {
  const res = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...goalData,
      targetAmount: Number(goalData.targetAmount),
      currentAmount: Number(goalData.currentAmount),
      targetDate: goalData.targetDate ? new Date(goalData.targetDate) : null,
    }),
  })
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create goal');
  }
  return res.json()
}

const GoalForm = () => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<GoalFormData>({
    userId: '',
    name: '',
    targetAmount: '',
    currentAmount: '',
    targetDate: '',
  })

  const mutation = useMutation<any, Error, GoalFormData>({ // Explicitly type mutation
    mutationFn: createGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
      setFormData({ userId: '', name: '', targetAmount: '', currentAmount: '', targetDate: '' }) // Clear form
    },
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.userId || !formData.name || !formData.targetAmount || !formData.currentAmount) {
      alert('Please fill in all required fields')
      return
    }
    if (isNaN(Number(formData.targetAmount)) || isNaN(Number(formData.currentAmount))) {
      alert('Target Amount and Current Amount must be numbers.')
      return;
    }
    mutation.mutate(formData)
  }

  return (
    <div className="bg-white p-4 rounded shadow mt-4">
      <h2 className="text-xl font-semibold mb-2">Add New Goal</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="userId" className="block text-sm font-medium text-gray-700">User ID (Placeholder)</label>
          <input
            type="text"
            name="userId"
            id="userId"
            value={formData.userId}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">Goal Name</label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="targetAmount" className="block text-sm font-medium text-gray-700">Target Amount</label>
          <input
            type="number"
            name="targetAmount"
            id="targetAmount"
            value={formData.targetAmount}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="currentAmount" className="block text-sm font-medium text-gray-700">Current Amount</label>
          <input
            type="number"
            name="currentAmount"
            id="currentAmount"
            value={formData.currentAmount}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <div>
          <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">Target Date (Optional)</label>
          <input
            type="date"
            name="targetDate"
            id="targetDate"
            value={formData.targetDate}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? 'Adding...' : 'Add Goal'}
        </button>
        {mutation.isError && <p className="text-red-500">Error: {mutation.error.message}</p>}
        {mutation.isSuccess && <p className="text-green-500">Goal added successfully!</p>}
      </form>
    </div>
  )
}

export default GoalForm