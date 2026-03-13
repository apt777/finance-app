'use client'

import React from 'react'
import { useGoals } from '@/hooks/useGoals'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Target, Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useColorMode } from '@/context/ColorModeContext'
import { useUiTheme } from '@/context/UiThemeContext'

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
  const { theme } = useUiTheme()
  const { colorMode } = useColorMode()
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
  const isDark = colorMode === 'dark'

  // Calculate progress percentage
  const goalsWithProgress = goals.map(goal => ({
    ...goal,
    progress: Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
  }))

  return (
    <div className={`space-y-4 pb-20 md:space-y-6 md:pb-0 ${theme === 'modern' ? isDark ? 'rounded-[38px] border border-white/10 bg-white/5 p-5 shadow-[0_22px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl md:p-7' : 'rounded-[38px] border border-white/80 bg-white/60 p-5 shadow-[0_22px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl md:p-7' : ''}`}>
      {/* Goals List */}
      {goalsWithProgress.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goalsWithProgress.map((goal) => (
            <div
              key={goal.id}
              className={`overflow-hidden border transition-all duration-200 ${theme === 'modern' ? isDark ? 'rounded-[30px] border-white/10 bg-white/5 shadow-[0_14px_34px_rgba(0,0,0,0.24)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.28)]' : 'rounded-[30px] border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] shadow-[0_14px_34px_rgba(148,163,184,0.14)] hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(148,163,184,0.18)]' : 'rounded-2xl border-slate-100 bg-white shadow-sm hover:shadow-md'}`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${theme === 'modern' ? isDark ? 'bg-white/8 text-white' : 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold ${theme === 'modern' ? isDark ? 'text-white' : 'text-slate-900' : 'text-slate-800'}`}>{goal.name}</h3>
                      {goal.targetDate && (
                        <div className={`mt-0.5 flex items-center text-xs ${theme === 'modern' ? isDark ? 'text-slate-400' : 'text-slate-500' : 'text-slate-500'}`}>
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(goal.targetDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, goal.id, goal.name)}
                    className={`p-1 transition-colors ${theme === 'modern' ? isDark ? 'text-slate-500 hover:text-red-300' : 'text-slate-300 hover:text-red-500' : 'text-slate-300 hover:text-red-500'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className={`rounded-[24px] p-4 ${theme === 'modern' ? isDark ? 'bg-white/5' : 'bg-slate-50/80' : ''}`}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className={theme === 'modern' ? isDark ? 'text-white' : 'text-slate-900' : 'text-blue-600'}>{goal.progress}%</span>
                      <span className={`${theme === 'modern' ? isDark ? 'text-slate-400' : 'text-slate-500' : 'text-slate-400'}`}>{tGoals('targetAmount')}: {goal.targetAmount.toLocaleString()} {goal.targetCurrency}</span>
                    </div>
                    <div className={`mt-3 h-2.5 w-full overflow-hidden rounded-full ${theme === 'modern' ? isDark ? 'bg-white/10' : 'bg-slate-200' : 'bg-slate-100'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ease-out ${theme === 'modern' ? 'bg-gradient-to-r from-slate-900 via-blue-700 to-cyan-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div className={`rounded-[20px] p-3 ${theme === 'modern' ? isDark ? 'bg-white/5' : 'bg-slate-50/80' : 'bg-slate-50 rounded-lg p-2'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'modern' ? isDark ? 'text-slate-500' : 'text-slate-400' : 'text-slate-400'}`}>{tGoals('currentAmount')}</p>
                      <p className={`font-bold ${theme === 'modern' ? isDark ? 'text-white' : 'text-slate-800' : 'text-slate-700'}`}>
                        {goal.currentAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">{goal.targetCurrency}</span>
                      </p>
                    </div>
                    <div className={`rounded-[20px] p-3 ${theme === 'modern' ? isDark ? 'bg-white/5' : 'bg-slate-50/80' : 'bg-slate-50 rounded-lg p-2'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${theme === 'modern' ? isDark ? 'text-slate-500' : 'text-slate-400' : 'text-slate-400'}`}>{tGoals('targetAmount')}</p>
                      <p className={`font-bold ${theme === 'modern' ? isDark ? 'text-white' : 'text-slate-800' : 'text-slate-700'}`}>
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
        <div className={`text-center ${theme === 'modern' ? isDark ? 'rounded-[30px] border border-white/10 bg-white/5 p-12 shadow-[0_14px_34px_rgba(0,0,0,0.24)]' : 'rounded-[30px] border border-white/80 bg-white p-12 shadow-[0_14px_34px_rgba(148,163,184,0.14)]' : 'rounded-2xl border border-slate-100 bg-white p-12 shadow-sm'}`}>
          <Target className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 text-sm mb-6">{tGoals('noGoals')}</p>
        </div>
      )}
    </div>
  )
}

export default GoalList
