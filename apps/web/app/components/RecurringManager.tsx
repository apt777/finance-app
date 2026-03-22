'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Repeat } from 'lucide-react'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useRecurringTransactions } from '@/hooks/useRecurringTransactions'
import { useLocale, useTranslations } from 'next-intl'
import { getUiCopy } from '@/lib/uiCopy'

export default function RecurringManager() {
  const tCommon = useTranslations('common')
  const locale = useLocale()
  const ui = getUiCopy(locale)
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: items = [], isLoading } = useRecurringTransactions()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryKey, setCategoryKey] = useState('housing')
  const [feedback, setFeedback] = useState<string | null>(null)

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  )

  const saveRecurring = useMutation({
    mutationFn: async () => {
      const selectedAccount = accounts.find((account) => account.id === accountId)
      const response = await fetch('/api/recurring-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          type: 'expense',
          amount: Number(amount),
          currency: selectedAccount?.currency || 'JPY',
          categoryKey,
          accountId,
          interval: 'monthly',
          dayOfMonth: new Date().getDate(),
          startDate: new Date().toISOString().split('T')[0],
          isActive: true,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || ui.managers.recurringTitle)
      return result
    },
    onSuccess: () => {
      setName('')
      setDescription('')
      setAmount('')
      setFeedback(null)
      queryClient.invalidateQueries({ queryKey: ['recurring-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
    },
    onError: (error: Error) => setFeedback(error.message),
  })

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
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder={ui.managers.recurringNamePlaceholder} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" />
          <input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={ui.managers.recurringDescPlaceholder} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" />
          <input value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="0" type="number" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900" />
          <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
            <option value="">{ui.managers.selectAccount}</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
          <select value={categoryKey} onChange={(event) => setCategoryKey(event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900">
            {expenseCategories.map((category) => (
              <option key={category.key} value={category.key}>{category.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => saveRecurring.mutate()}
            disabled={!name.trim() || !description.trim() || !amount || !accountId || saveRecurring.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {ui.managers.saveRecurring}
          </button>
        </div>
        {feedback ? <p className="mt-3 text-sm text-rose-600">{feedback}</p> : null}
        {feedback?.includes('반복거래 기능은 아직') || feedback?.toLowerCase().includes('recurring') ? (
          <p className="mt-2 text-xs leading-6 text-slate-500">
            {ui.managers.recurringMigrationHint}
          </p>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6">
        <h4 className="text-lg font-bold text-slate-900">{ui.managers.currentRecurring}</h4>
        <div className="mt-4 space-y-3">
          {isLoading ? <p className="text-sm text-slate-500">{tCommon('loading')}</p> : null}
          {!isLoading && items.length === 0 ? <p className="text-sm text-slate-500">{ui.managers.noRecurring}</p> : null}
          {items.map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900">{item.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                </div>
                <p className="font-bold text-slate-900">{Math.round(item.amount).toLocaleString()} {item.currency}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
