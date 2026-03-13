'use client'

import React, { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Tags, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function CategoryManager() {
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const { data: categories, isLoading, isError } = useCategories()
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')

  const createCategory = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, type }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create category')
      }
      return result
    },
    onSuccess: () => {
      setName('')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/categories?id=${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete category')
      }
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })

  if (isLoading) {
    return <div className="text-slate-500">{tCommon('loading')}</div>
  }

  if (isError) {
    return <div className="text-red-600">{tCommon('error')}</div>
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">카테고리 관리</h3>
        <p className="text-slate-600 text-sm mb-5">거래 입력에서 사용할 수입/지출 카테고리를 직접 추가할 수 있습니다.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="예: 반려동물, 경조사"
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900"
          />
          <select
            value={type}
            onChange={(event) => setType(event.target.value as 'income' | 'expense')}
            className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900"
          >
            <option value="expense">{tTransactions('expense')}</option>
            <option value="income">{tTransactions('income')}</option>
          </select>
          <button
            onClick={() => createCategory.mutate()}
            disabled={!name.trim() || createCategory.isPending}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-blue-600 text-white disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            카테고리 추가
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tags className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">현재 카테고리</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(categories || []).map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="font-semibold text-slate-800">{category.name}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {category.type === 'income' ? tTransactions('income') : category.type === 'expense' ? tTransactions('expense') : tTransactions('transfer')}
                  {category.isDefault ? ' · 기본' : ' · 사용자'}
                </p>
              </div>
              {!category.isDefault && (
                <button
                  onClick={() => deleteCategory.mutate(category.id)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  {tCommon('delete')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
