'use client'

import React from 'react'
import { Target, Plus } from 'lucide-react'
import GoalList from '@/components/GoalList'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'

export default function GoalsPage() {
  const t = useTranslations('goals')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800">{t('title')}</h1>
            <p className="text-slate-600 text-sm mt-1">Set financial goals and track your progress</p>
          </div>
        </div>
        <Link
          href="/goals/add"
          className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          <span>{t('addGoal')}</span>
        </Link>
      </div>

      {/* Goals List */}
      <GoalList />
    </div>
  )
}
