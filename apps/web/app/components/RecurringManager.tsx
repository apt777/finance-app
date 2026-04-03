'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Power, Repeat, Trash2 } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'

type RecurringFormState = {
  name: string
  description: string
  amount: string
  accountId: string
  categoryKey: string
  currency: string
  type: 'income' | 'expense'
  dayOfMonth: string
  isActive: boolean
}

function buildInitialForm() {
  return {
    name: '',
    description: '',
    amount: '',
    accountId: '',
    categoryKey: 'housing',
    currency: 'JPY',
    type: 'expense' as const,
    dayOfMonth: String(new Date().getDate()),
    isActive: true,
  }
}

export default function RecurringManager() {
  const tCommon = useTranslations('common')
  const tTransactions = useTranslations('transactions')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: items = [], isLoading } = useRecurringTransactions()
  const [form, setForm] = useState<RecurringFormState>(buildInitialForm())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  )
  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'income'),
    [categories]
  )
  const categoryOptions = form.type === 'income' ? incomeCategories : expenseCategories

  const saveRecurring = useMutation({
    mutationFn: async () => {
      const selectedAccount = accounts.find((account) => account.id === form.accountId)
      const payload = {
        name: form.name,
        description: form.description,
        type: form.type,
        amount: Number(form.amount),
        currency: selectedAccount?.currency || form.currency || 'JPY',
        categoryKey: form.categoryKey,
        accountId: form.accountId,
        interval: 'monthly',
        dayOfMonth: Number(form.dayOfMonth),
        startDate: new Date().toISOString().split('T')[0],
        isActive: form.isActive,
      }

      const response = await fetch(editingId ? `/api/recurring-transactions/${editingId}` : '/api/recurring-transactions', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || ui.managers.recurringTitle)
      return result
    },
    onSuccess: () => {
      setForm(buildInitialForm())
      setEditingId(null)
      setFeedback(null)
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
    onError: (error: Error) => setFeedback(error.message),
  })

  const deleteRecurring = useMutation({
    mutationFn: async (recurringId: string) => {
      const response = await fetch(`/api/recurring-transactions/${recurringId}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || ui.managers.recurringTitle)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      if (editingId) {
        setEditingId(null)
        setForm(buildInitialForm())
      }
    },
    onError: (error: Error) => setFeedback(error.message),
  })

  const toggleRecurring = useMutation({
    mutationFn: async (item: (typeof items)[number]) => {
      const response = await fetch(`/api/recurring-transactions/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          type: item.type,
          amount: item.amount,
          currency: item.currency,
          categoryKey: item.categoryKey,
          accountId: item.accountId,
          interval: item.interval,
          dayOfMonth: item.dayOfMonth,
          dayOfWeek: item.dayOfWeek,
          startDate: item.startDate,
          endDate: item.endDate,
          isActive: !item.isActive,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || ui.managers.recurringTitle)
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    },
    onError: (error: Error) => setFeedback(error.message),
  })

  const handleEdit = (item: (typeof items)[number]) => {
    setEditingId(item.id)
    setFeedback(null)
    setForm({
      name: item.name,
      description: item.description,
      amount: String(Math.abs(item.amount)),
      accountId: item.accountId || item.account?.id || '',
      categoryKey: item.categoryKey || ((item.type === 'income' ? incomeCategories[0] : expenseCategories[0])?.key || 'salary'),
      currency: item.currency,
      type: item.type === 'income' ? 'income' : 'expense',
      dayOfMonth: String(item.dayOfMonth || new Date(item.nextRunDate || item.startDate).getDate()),
      isActive: item.isActive,
    })
  }

  const handleReset = () => {
    setEditingId(null)
    setFeedback(null)
    setForm(buildInitialForm())
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-indigo-200 bg-indigo-50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Repeat className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xl font-black tracking-[-0.03em] text-slate-950">{ui.managers.recurringTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{ui.managers.recurringDesc}</p>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{ui.managers.recurringTitle}</span>
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder={ui.managers.recurringNamePlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{tTransactions('description')}</span>
            <input
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder={ui.managers.recurringDescPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{ui.overview.amountLabel}</span>
            <input
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))}
              placeholder="8000"
              type="number"
              step="1"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{ui.managers.selectAccount}</span>
            <select
              value={form.accountId}
              onChange={(event) => {
                const nextAccount = accounts.find((account) => account.id === event.target.value)
                setForm((current) => ({
                  ...current,
                  accountId: event.target.value,
                  currency: nextAccount?.currency || current.currency,
                }))
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            >
              <option value="">{ui.managers.selectAccount}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{tTransactions('type')}</span>
            <select
              value={form.type}
              onChange={(event) => {
                const nextType = event.target.value as 'income' | 'expense'
                const nextCategory = (nextType === 'income' ? incomeCategories : expenseCategories)[0]?.key || ''
                setForm((current) => ({
                  ...current,
                  type: nextType,
                  categoryKey: nextCategory,
                }))
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            >
              <option value="expense">{tTransactions('expense')}</option>
              <option value="income">{tTransactions('income')}</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{tTransactions('category')}</span>
            <select
              value={form.categoryKey}
              onChange={(event) => setForm((current) => ({ ...current, categoryKey: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            >
              {categoryOptions.map((category) => (
                <option key={category.key} value={category.key}>{category.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold text-slate-500">{ui.managers.dayOfMonthLabel}</span>
            <input
              value={form.dayOfMonth}
              onChange={(event) => setForm((current) => ({ ...current, dayOfMonth: event.target.value }))}
              placeholder="5"
              type="number"
              min="1"
              max="31"
              step="1"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
            />
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => saveRecurring.mutate()}
              disabled={!form.name.trim() || !form.description.trim() || !form.amount || !form.accountId || saveRecurring.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {editingId ? ui.managers.saveChanges : ui.managers.saveRecurring}
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
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{ui.managers.dayOfMonthHint}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1.5">{ui.overview.amountLabel}: {form.amount || '-'} {form.currency}</span>
        </div>
        {feedback ? <p className="mt-3 text-sm text-rose-600">{feedback}</p> : null}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <h4 className="text-lg font-bold text-slate-900">{ui.managers.currentRecurring}</h4>
        <div className="mt-4 space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">{tCommon('loading')}</p> : null}
          {!isLoading && items.length === 0 ? <p className="text-sm text-slate-500">{ui.managers.noRecurring}</p> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                      {item.isActive ? ui.managers.activeLabel : ui.managers.inactiveLabel}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                    <span className="rounded-full bg-white px-2.5 py-1">
                      {ui.managers.dayOfMonthLabel}: {item.dayOfMonth || new Date(item.nextRunDate || item.startDate).getDate()}
                    </span>
                    {item.nextRunDate ? (
                      <span className="rounded-full bg-white px-2.5 py-1">
                        {new Date(item.nextRunDate).toISOString().slice(0, 10)}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">{Math.round(item.amount).toLocaleString()} {item.currency}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRecurring.mutate(item)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold ${item.isActive ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Power className="h-3.5 w-3.5" />
                        {item.isActive ? ui.managers.inactiveLabel : ui.managers.activeLabel}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
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
                        if (confirm(ui.managers.deleteRecurringConfirm)) {
                          deleteRecurring.mutate(item.id)
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
