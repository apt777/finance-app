'use client'

import React, { useState } from 'react'
import { useCategories } from '@/hooks/useCategories'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'

export default function CategoryManager() {
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const queryClient = useQueryClient()
  const { data: categories, isLoading, isError } = useCategories()
  const [name, setName] = useState('')
  const [type, setType] = useState<'income' | 'expense'>('expense')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

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
      setFeedback(null)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error: Error) => {
      setFeedback(error.message || ui.managers.createCategoryFailed)
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
      setFeedback(null)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error: Error) => {
      setFeedback(error.message || ui.managers.deleteCategoryFailed)
    },
  })

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch('/api/categories', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update category')
      }
      return result
    },
    onSuccess: () => {
      setFeedback(null)
      setEditingId(null)
      setEditingName('')
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
    },
    onError: (error: Error) => {
      setFeedback(error.message || ui.managers.updateCategoryFailed)
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
        <h3 className="text-lg font-bold text-slate-800 mb-2">{ui.managers.categoryTitle}</h3>
        <p className="text-slate-600 text-sm mb-5">{ui.managers.categoryDesc}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ui.managers.categoryPlaceholder}
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
            {ui.managers.addCategory}
          </button>
        </div>
        {feedback && (
          <p className="mt-3 text-sm text-rose-600">{feedback}</p>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tags className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-slate-800">{ui.managers.currentCategories}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(categories || []).map((category) => (
            <div key={category.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="min-w-0 flex-1 pr-3">
                {editingId === category.id ? (
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-900"
                  />
                ) : (
                  <p className="font-semibold text-slate-800">{category.name}</p>
                )}
                <p className="text-xs text-slate-500 mt-1">
                  {category.type === 'income' ? tTransactions('income') : category.type === 'expense' ? tTransactions('expense') : tTransactions('transfer')}
                  {category.isDefault ? ` · ${ui.managers.defaultTag}` : ` · ${ui.managers.customTag}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {editingId === category.id ? (
                  <>
                    <button
                      onClick={() => updateCategory.mutate({ id: category.id, name: editingName })}
                      disabled={!editingName.trim() || updateCategory.isPending}
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-600 transition-all hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null)
                        setEditingName('')
                        setFeedback(null)
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(category.id)
                        setEditingName(category.name)
                        setFeedback(null)
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    {!category.isDefault && (
                      <button
                        onClick={() => deleteCategory.mutate(category.id)}
                        disabled={deleteCategory.isPending}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-600 transition-all hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleteCategory.isPending ? tCommon('loading') : tCommon('delete')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
