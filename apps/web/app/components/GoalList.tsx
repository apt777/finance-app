'use client'

import React from 'react'
import { useGoals } from '../hooks/useGoals'
import Link from 'next/link'

interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

const GoalList = () => {
  const { data, error, isLoading } = useGoals()

  if (isLoading) return <div>Loading goals...</div>
  if (error) return <div>Error fetching goals</div>

  const goals: Goal[] = (data as Goal[]) || []

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-semibold mb-4">Goal List</h2>

      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((goal: Goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100
            const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString() : 'N/A'
            return (
              <div key={goal.id} className="bg-gray-50 p-4 rounded shadow">
                <h3 className="text-lg font-semibold mb-2">{goal.name}</h3>
                <p>Target: {goal.targetAmount}</p>
                <p>Current: {goal.currentAmount}</p>
                <p>Target Date: {targetDate}</p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${Math.min(100, progress)}%` }}
                  ></div>
                </div>
                <p className="text-sm text-right mt-1">{progress.toFixed(2)}%</p>
              </div>
            )
          })}
        </div>
      ) : (
        <p>No goals found.</p>
      )}

      <Link href="/goals/add" className="mt-4 inline-block bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Add New Goal
      </Link>
    </div>
  )
}

export default GoalList