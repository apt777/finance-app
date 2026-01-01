'use client'

import React from 'react'
import { useGoals } from '@/hooks/useGoals'
import { Target, Calendar, TrendingUp } from 'lucide-react'

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-slate-600">목표 정보 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">목표 정보를 불러오는 중 오류 발생</p>
      </div>
    )
  }

  const goals: Goal[] = (data as Goal[]) || []

  return (
    <div className="space-y-6">
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal: Goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100
            const remaining = goal.targetAmount - goal.currentAmount
            const targetDate = goal.targetDate ? new Date(goal.targetDate).toLocaleDateString('ko-KR') : null
            const daysRemaining = targetDate ? Math.ceil((new Date(goal.targetDate!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null

            return (
              <div
                key={goal.id}
                className="bg-white rounded-2xl shadow-lg border border-slate-200 hover:shadow-xl transition-all duration-200 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-slate-800">{goal.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">목표 금액: {goal.targetAmount.toLocaleString()} 원</p>
                    </div>
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Target className="w-5 h-5 text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">진행률</span>
                      <span className="text-sm font-bold text-blue-600">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Amount Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 mb-1">현재 금액</p>
                      <p className="text-lg font-bold text-slate-800">
                        {goal.currentAmount.toLocaleString()}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-600 mb-1">남은 금액</p>
                      <p className="text-lg font-bold text-blue-600">
                        {remaining.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Target Date */}
                  {targetDate && (
                    <div className="flex items-center space-x-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                      <Calendar className="w-4 h-4" />
                      <span>{targetDate}</span>
                      {daysRemaining !== null && daysRemaining > 0 && (
                        <span className="ml-auto font-medium text-slate-800">
                          {daysRemaining}일 남음
                        </span>
                      )}
                      {daysRemaining !== null && daysRemaining <= 0 && (
                        <span className="ml-auto font-medium text-red-600">
                          기한 초과
                        </span>
                      )}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex items-center space-x-2">
                    {progress >= 100 ? (
                      <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-green-700">목표 달성!</span>
                      </div>
                    ) : progress >= 75 ? (
                      <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">거의 다 왔어요!</span>
                      </div>
                    ) : (
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center space-x-2">
                        <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                        <span className="text-sm font-medium text-slate-600">진행 중</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 shadow-lg border border-slate-200 text-center">
          <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">목표가 없습니다.</p>
          <p className="text-slate-500 text-sm mt-1">새로운 목표를 추가하여 시작하세요!</p>
        </div>
      )}
    </div>
  )
}

export default GoalList
