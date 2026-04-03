'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PiggyBank, Plus } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'

export default function BudgetManager() {
  const tCommon = useTranslations('common')
  const tTransactions = useTranslations('transactions')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const queryClient = useQueryClient()
  const { data: budgets = [], isLoading } = useBudgets()
  const { data: categories = [] } = useCategories()
  const today = new Date()
  const [name, setName] = useState('')
  const [categoryKey, setCategoryKey] = useState('food')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('JPY')
  const [feedback, setFeedback] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  )

  const saveBudget = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          categoryKey,
          amount: Number(amount),
          currency,
          period: 'monthly',
          year: today.getFullYear(),
          month: today.getMonth() + 1,
          alertThreshold: 80,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || ui.managers.budgetTitle)
      return result
    },
    onSuccess: () => {
      setName('')
      setAmount('')
      setFeedback(null)
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error: Error) => {
      setFeedback(error.message)
    },
  })

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <PiggyBank className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{ui.managers.budgetTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{ui.managers.budgetDesc}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={ui.managers.budgetPlaceholder}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          />
          <select
            value={categoryKey}
            onChange={(event) => setCategoryKey(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          >
            {expenseCategories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="0"
            type="number"
            step="1"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          />
          <button
            type="button"
            onClick={() => saveBudget.mutate()}
            disabled={!name.trim() || !amount || saveBudget.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {ui.managers.saveBudget}
          </button>
        </div>
        {feedback ? <p className="mt-3 text-sm text-rose-600">{feedback}</p> : null}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <h4 className="text-lg font-bold text-slate-900">{ui.managers.currentBudgets}</h4>
        <div className="mt-4 space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">{tCommon('loading')}</p> : null}
          {!isLoading && budgets.length === 0 ? <p className="text-sm text-slate-500">{ui.managers.noBudgets}</p> : null}
          {budgets.map((budget) => (
            <div key={budget.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{budget.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {expenseCategories.find((category) => category.key === budget.categoryKey)?.name || tTransactions('category')}
                  </p>
                </div>
                <p className="font-bold text-slate-900">{Math.round(budget.amount).toLocaleString()} {budget.currency}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
