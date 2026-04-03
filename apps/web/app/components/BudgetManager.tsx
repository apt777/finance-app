'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, PiggyBank, Plus, Trash2 } from 'lucide-react'
import { useBudgets } from '@/hooks/useBudgets'
import { useCategories } from '@/hooks/useCategories'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'
import { SUPPORTED_CURRENCIES } from '@/lib/currency'

type BudgetFormState = {
  name: string
  categoryKey: string
  amount: string
  currency: string
  year: number
  month: number
  alertThreshold: string
}

function buildInitialForm(): BudgetFormState {
  const today = new Date()
  return {
    name: '',
    categoryKey: 'food',
    amount: '',
    currency: 'JPY',
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    alertThreshold: '80',
  }
}

export default function BudgetManager() {
  const tCommon = useTranslations('common')
  const tTransactions = useTranslations('transactions')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const queryClient = useQueryClient()
  const { data: budgets = [], isLoading } = useBudgets()
  const { data: categories = [] } = useCategories()
  const [form, setForm] = useState<BudgetFormState>(buildInitialForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  )
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear()
    return [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]
  }, [])
  const monthOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index + 1), [])

  const saveBudget = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        amount: Number(form.amount),
        alertThreshold: Number(form.alertThreshold) || 80,
        period: 'monthly',
      }

      const response = await fetch(editingId ? `/api/budgets/${editingId}` : '/api/budgets', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || ui.managers.budgetTitle)
      return result
    },
    onSuccess: () => {
      setForm(buildInitialForm())
      setEditingId(null)
      setFeedback(null)
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error: Error) => {
      setFeedback(error.message)
    },
  })

  const deleteBudget = useMutation({
    mutationFn: async (budgetId: string) => {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || ui.managers.deleteCategoryFailed)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      if (editingId) {
        setEditingId(null)
        setForm(buildInitialForm())
      }
    },
    onError: (error: Error) => setFeedback(error.message),
  })

  const handleEdit = (budget: (typeof budgets)[number]) => {
    setEditingId(budget.id)
    setFeedback(null)
    setForm({
      name: budget.name,
      categoryKey: budget.categoryKey || expenseCategories[0]?.key || 'food',
      amount: String(Math.round(budget.amount)),
      currency: budget.currency,
      year: budget.year,
      month: budget.month || new Date().getMonth() + 1,
      alertThreshold: String(budget.alertThreshold),
    })
  }

  const handleReset = () => {
    setEditingId(null)
    setFeedback(null)
    setForm(buildInitialForm())
  }

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
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder={ui.managers.budgetPlaceholder}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          />
          <select
            value={form.categoryKey}
            onChange={(event) => setForm((current) => ({ ...current, categoryKey: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          >
            {expenseCategories.map((category) => (
              <option key={category.key} value={category.key}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            value={form.amount}
            onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
            placeholder={`${ui.overview.amountLabel}: 40000`}
            type="number"
            step="1"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          />
          <select
            value={form.currency}
            onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          >
            {SUPPORTED_CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {ui.overview.currencyLabel}: {currency}
              </option>
            ))}
          </select>
          <select
            value={form.year}
            onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <select
            value={form.month}
            onChange={(event) => setForm((current) => ({ ...current, month: Number(event.target.value) }))}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          >
            {monthOptions.map((month) => (
              <option key={month} value={month}>
                {month}
              </option>
            ))}
          </select>
          <input
            value={form.alertThreshold}
            onChange={(event) => setForm((current) => ({ ...current, alertThreshold: event.target.value }))}
            placeholder="80"
            type="number"
            step="1"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => saveBudget.mutate()}
              disabled={!form.name.trim() || !form.amount || saveBudget.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {editingId ? ui.managers.saveChanges : ui.managers.saveBudget}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
              >
                {tCommon('cancel')}
              </button>
            ) : null}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-slate-500 md:grid-cols-3">
          <p>{ui.overview.amountLabel}: {ui.overview.amountHint}</p>
          <p>{ui.overview.yearLabel}: {form.year} / {ui.overview.monthLabel}: {form.month}</p>
          <p>{ui.managers.alertThresholdLabel}: {ui.managers.alertThresholdHint} ({form.alertThreshold || '80'}%)</p>
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
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{budget.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {expenseCategories.find((category) => category.key === budget.categoryKey)?.name || tTransactions('category')}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">
                      {ui.managers.periodMonthLabel(budget.year, budget.month || 1)}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1">
                      {ui.managers.alertThresholdLabel}: {budget.alertThreshold}%
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{Math.round(budget.amount).toLocaleString()} {budget.currency}</p>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(budget)}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        {tCommon('edit')}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(ui.managers.deleteBudgetConfirm)) {
                          deleteBudget.mutate(budget.id)
                        }
                      }}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 className="h-3.5 w-3.5" />
                        {tCommon('delete')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
