'use client'

import React from 'react'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { QuickActionItem, useQuickActions } from '@/hooks/useQuickActions'

const createEmptyAction = (): QuickActionItem => ({
  id: `quick-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  label: '',
  type: 'expense',
  description: '',
  categoryKey: '',
  notes: '',
  accountId: '',
  fromAccountId: '',
  toAccountId: '',
})

export default function QuickActionManager() {
  const tSettings = useTranslations('settings')
  const tTransactions = useTranslations('transactions')
  const tAccounts = useTranslations('accounts')
  const tCommon = useTranslations('common')
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { quickActions, saveQuickActions, isSaving } = useQuickActions()
  const [drafts, setDrafts] = React.useState<QuickActionItem[]>([])
  const [saveState, setSaveState] = React.useState<'idle' | 'done' | 'error'>('idle')

  React.useEffect(() => {
    setDrafts(quickActions)
  }, [quickActions])

  const setAction = (id: string, updates: Partial<QuickActionItem>) => {
    setDrafts((current) =>
      current.map((item) => {
        if (item.id !== id) return item
        const next = { ...item, ...updates }
        if (next.type !== 'transfer') {
          next.fromAccountId = ''
          next.toAccountId = ''
        }
        if (next.type === 'transfer') {
          next.categoryKey = 'transfer'
          next.accountId = ''
        }
        if (next.type === 'income' || next.type === 'expense') {
          next.accountId = next.accountId || ''
        }
        return next
      }),
    )
    setSaveState('idle')
  }

  const handleAdd = () => {
    setDrafts((current) => [...current, createEmptyAction()].slice(0, 6))
    setSaveState('idle')
  }

  const handleDelete = (id: string) => {
    setDrafts((current) => current.filter((item) => item.id !== id))
    setSaveState('idle')
  }

  const handleSave = async () => {
    try {
      const normalized = drafts
        .map((item) => ({
          ...item,
          label: item.label.trim(),
          description: item.description.trim(),
          notes: item.notes?.trim() || '',
        }))
        .filter((item) => item.label && item.description)

      await saveQuickActions(normalized)
      setSaveState('done')
      window.setTimeout(() => setSaveState('idle'), 2400)
    } catch {
      setSaveState('error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-black tracking-[-0.03em] text-slate-950">{tSettings('quickActionsSettings')}</h3>
            <p className="mt-2 text-sm text-slate-500">{tSettings('quickActionsDesc')}</p>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={drafts.length >= 6}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            <span>{tSettings('addQuickAction')}</span>
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {drafts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">{tSettings('quickActionsEmpty')}</p>
            </div>
          ) : (
            drafts.map((action) => {
              const filteredCategories = categories.filter((category) => category.type === action.type)

              return (
                <div key={action.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">{tSettings('quickActionLabel')}</label>
                      <input
                        value={action.label}
                        onChange={(event) => setAction(action.id, { label: event.target.value })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        placeholder={tSettings('quickActionLabelPlaceholder')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-800">{tTransactions('type')}</label>
                      <select
                        value={action.type}
                        onChange={(event) => setAction(action.id, { type: event.target.value as QuickActionItem['type'] })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="expense">{tTransactions('expense')}</option>
                        <option value="income">{tTransactions('income')}</option>
                        <option value="transfer">{tTransactions('transfer')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-800">{tTransactions('description')}</label>
                    <input
                      value={action.description}
                      onChange={(event) => setAction(action.id, { description: event.target.value })}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      placeholder={tSettings('quickActionDescriptionPlaceholder')}
                    />
                  </div>

                  {action.type === 'transfer' ? (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">{tTransactions('fromAccount')}</label>
                        <select
                          value={action.fromAccountId || ''}
                          onChange={(event) => setAction(action.id, { fromAccountId: event.target.value })}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{tAccounts('selectAccount')}</option>
                          {accounts.map((account: any) => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">{tTransactions('toAccount')}</label>
                        <select
                          value={action.toAccountId || ''}
                          onChange={(event) => setAction(action.id, { toAccountId: event.target.value })}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{tAccounts('selectAccount')}</option>
                          {accounts.map((account: any) => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">{tTransactions('account')}</label>
                        <select
                          value={action.accountId || ''}
                          onChange={(event) => setAction(action.id, { accountId: event.target.value })}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{tAccounts('selectAccount')}</option>
                          {accounts.map((account: any) => (
                            <option key={account.id} value={account.id}>{account.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-800">{tTransactions('category')}</label>
                        <select
                          value={action.categoryKey || ''}
                          onChange={(event) => setAction(action.id, { categoryKey: event.target.value })}
                          className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">{tTransactions('allCategories')}</option>
                          {filteredCategories.map((category: any) => (
                            <option key={category.id} value={category.key}>{category.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold text-slate-800">{tTransactions('notes')}</label>
                      <input
                        value={action.notes || ''}
                        onChange={(event) => setAction(action.id, { notes: event.target.value })}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        placeholder={tTransactions('notesPlaceholder')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(action.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition-all hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>{tCommon('delete')}</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm">
            {saveState === 'done' ? <span className="text-emerald-600">{tSettings('quickActionsSaved')}</span> : null}
            {saveState === 'error' ? <span className="text-rose-600">{tCommon('error')}</span> : null}
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span>{isSaving ? tCommon('loading') : tCommon('save')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
