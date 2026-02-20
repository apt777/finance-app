'use client'

import React from 'react'
import { useGoals } from '@/hooks/useGoals'
import { Link } from '@/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Plus, Target, Calendar, TrendingUp } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetCurrency: string;
  targetDate?: string;
  priority: number;
}

const GoalList = () => {
  const tGoals = useTranslations('goals')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const { data, error, isLoading } = useGoals()

  const deleteGoalMutation = useMutation<any, Error, string>({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`/api/goals?id=${goalId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(tCommon('error'))
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  const handleDelete = (e: React.MouseEvent, goalId: string, goalName: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (confirm(`${goalName}: ${tGoals('deleteGoal')}?`)) {
      deleteGoalMutation.mutate(goalId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">{tCommon('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{tCommon('error')}</p>
      </div>
    )
  }

  const goals: Goal[] = (data as Goal[]) || []

  // Calculate progress percentage
  const goalsWithProgress = goals.map(goal => ({
    ...goal,
    progress: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
  }))

  return (
    <div className="space-y-4 md:space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-800">{tGoals('title')}</h2>
          <p className="text-slate-500 text-xs md:text-sm mt-0.5">{tGoals('totalGoals')}: {goals.length}</p>
        </div>
        <Link
          href="/goals/add"
          className="flex items-center justify-center w-10 h-10 md:w-auto md:h-auto md:px-4 md:py-2 bg-blue-600 text-white font-semibold rounded-xl shadow-md hover:bg-blue-700 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span className="hidden md:inline ml-2">{tGoals('addGoal')}</span>
        </Link>
      </div>

      {/* Goals List */}
      {goalsWithProgress.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalsWithProgress.map((goal) => (
            <div
              key={goal.id}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">{goal.name}</h3>
                      {goal.targetDate && (
                        <div className="flex items-center text-xs text-slate-500 mt-0.5">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, goal.id, goal.name)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-blue-600">{goal.progress}%</span>
                      <span className="text-slate-400">{tGoals('targetAmount')}: {goal.targetAmount.toLocaleString()} {goal.targetCurrency}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tGoals('currentAmount')}</p>
                      <p className="font-bold text-slate-700">
                        {goal.currentAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">{goal.targetCurrency}</span>
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{tGoals('targetAmount')}</p>
                      <p className="font-bold text-slate-700">
                        {goal.targetAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">{goal.targetCurrency}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-sm border border-slate-100 text-center">
          <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm mb-6">{tGoals('noGoals')}</p>
          <Link
            href="/goals/add"
            className="inline-flex items-center px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
          >
            <Plus className="w-5 h-5 mr-2" />
            <span>{tGoals('addGoal')}</span>
          </Link>
        </div>
      )}
    </div>
  )
}

export default GoalList