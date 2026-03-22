'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Wand2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { findDuplicateTransaction } from '@/lib/transactionDuplicates'

interface ParsedRow {
  id: string
  source: string
  date?: string
  description?: string
  amount?: number
  type?: 'income' | 'expense' | 'transfer'
  categoryKey?: string | null
  categoryName?: string | null
  confidence?: number
  error?: string | null
}

const parseTransactions = async (input: string) => {
  const response = await fetch('/api/beta/transaction-bulk-parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to parse transactions')
  }

  return response.json() as Promise<{ rows: ParsedRow[]; total: number }>
}

const createTransaction = async (payload: {
  accountId: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  categoryKey?: string | null
}) => {
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create transaction')
  }

  return response.json()
}

export default function AIBulkImportBeta() {
  const tSettings = useTranslations('settings')
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: existingTransactions = [] } = useTransactions()

  const [input, setInput] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const duplicateState = useMemo(() => {
    const result = new Map<string, string>()
    const seenDraftRows: Array<{
      id: string
      accountId?: string | null
      date: string
      description: string
      type: 'income' | 'expense' | 'transfer'
      amount: number
    }> = []

    for (const row of rows) {
      if (!selectedAccountId || row.error || row.type === 'transfer' || !row.date || !row.description || !row.amount || !row.type) {
        continue
      }

      const duplicateInExisting = findDuplicateTransaction(
        {
          accountId: selectedAccountId,
          date: row.date,
          description: row.description,
          type: row.type,
          amount: Number(row.amount),
          currency: selectedAccount?.currency,
        },
        existingTransactions
      )

      if (duplicateInExisting) {
        result.set(row.id, '이미 등록된 거래와 중복됩니다.')
        continue
      }

      const duplicateInDraft = findDuplicateTransaction(
        {
          accountId: selectedAccountId,
          date: row.date,
          description: row.description,
          type: row.type,
          amount: Number(row.amount),
          currency: selectedAccount?.currency,
        },
        seenDraftRows
      )

      if (duplicateInDraft) {
        result.set(row.id, '이번 일괄 등록 목록 안에서 중복됩니다.')
        continue
      }

      seenDraftRows.push({
        id: row.id,
        accountId: selectedAccountId,
        date: row.date,
        description: row.description,
        type: row.type,
        amount: Number(row.amount),
      })
    }

    return result
  }, [existingTransactions, rows, selectedAccount?.currency, selectedAccountId])
  const validRows = rows.filter((row) => !row.error && row.type !== 'transfer' && !duplicateState.has(row.id))

  const parseMutation = useMutation({
    mutationFn: parseTransactions,
    onSuccess: (result) => {
      setRows(result.rows)
      setFeedback(tSettings('betaParseDone', { count: result.rows.length }))
      setErrorMessage(null)
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
      setFeedback(null)
    },
  })

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!selectedAccount) {
        throw new Error(tSettings('betaSelectAccount'))
      }

      let importedCount = 0
      let skippedDuplicateCount = 0

      for (const row of validRows) {
        if (!row.date || !row.description || !row.amount || !row.type || row.type === 'transfer') {
          continue
        }

        try {
          await createTransaction({
            accountId: selectedAccount.id,
            date: row.date,
            description: row.description,
            type: row.type,
            amount: Number(row.amount),
            currency: selectedAccount.currency,
            categoryKey: row.categoryKey || undefined,
          })
          importedCount += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : ''

          if (message.includes('이미 같은 날짜') || message.includes('duplicate')) {
            skippedDuplicateCount += 1
            continue
          }

          throw error
        }
      }

      return { importedCount, skippedDuplicateCount }
    },
    onSuccess: ({ importedCount, skippedDuplicateCount }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      setFeedback(
        skippedDuplicateCount > 0
          ? `${importedCount}건 등록, ${skippedDuplicateCount}건 중복으로 건너뜀`
          : tSettings('betaImportDone', { count: importedCount })
      )
      setErrorMessage(null)
      setRows([])
      setInput('')
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
      setFeedback(null)
    },
  })

  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.key, category])), [categories])

  const updateRow = (id: string, patch: Partial<ParsedRow>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch, error: null } : row)))
  }

  const removeRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.96)_0%,rgba(255,247,237,0.98)_100%)] p-6 shadow-[0_18px_50px_rgba(251,191,36,0.10)]">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-amber-600">Beta</p>
            <h3 className="text-2xl font-black tracking-[-0.03em] text-slate-950">{tSettings('betaTitle')}</h3>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">{tSettings('betaDesc')}</p>
            <div className="rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-600">
              <p>{tSettings('betaExampleTitle')}</p>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-[12px] text-slate-700">
{`3/1 스타벅스 5800
3/2 월급 250000
3/3 전철 1400`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">{tSettings('betaInputLabel')}</label>
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={tSettings('betaInputPlaceholder')}
              className="min-h-[220px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800">{tSettings('betaAccountLabel')}</label>
              <select
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{tSettings('betaSelectAccount')}</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} ({account.currency})
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">{tSettings('betaAccountHelp')}</p>
            </div>

            <button
              type="button"
              onClick={() => parseMutation.mutate(input)}
              disabled={!input.trim() || parseMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              {parseMutation.isPending ? tCommon('loading') : tSettings('betaParse')}
            </button>

            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={!selectedAccount || validRows.length === 0 || importMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {importMutation.isPending ? tCommon('loading') : tSettings('betaImport')}
            </button>
          </div>
        </div>

        {feedback ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-black tracking-[-0.02em] text-slate-950">{tSettings('betaPreviewTitle')}</h4>
              <p className="mt-1 text-sm text-slate-500">{tSettings('betaPreviewDesc')}</p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {validRows.length}/{rows.length}
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {rows.map((row) => {
              if (row.error) {
                return (
                  <div key={row.id} className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="mt-0.5 h-5 w-5 text-rose-500" />
                        <div>
                          <p className="text-sm font-semibold text-rose-700">{row.error}</p>
                          <p className="mt-1 text-xs text-slate-600">{row.source}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeRow(row.id)} className="text-slate-400 transition-colors hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              }

              const filteredCategories = categories.filter((category) => category.type === row.type)

              return (
                <div key={row.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_minmax(0,1fr)_140px_140px_180px_auto] md:items-center">
                    <input
                      type="date"
                      value={row.date || ''}
                      onChange={(event) => updateRow(row.id, { date: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={row.description || ''}
                      onChange={(event) => updateRow(row.id, { description: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      value={row.amount || 0}
                      onChange={(event) => updateRow(row.id, { amount: Number(event.target.value) })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    />
                    <select
                      value={row.type}
                      onChange={(event) => {
                        const nextType = event.target.value as 'income' | 'expense' | 'transfer'
                        const nextCategory = categories.find((category) => category.type === nextType)
                        updateRow(row.id, {
                          type: nextType,
                          categoryKey: nextCategory?.key || null,
                        })
                      }}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="expense">{tTransactions('expense')}</option>
                      <option value="income">{tTransactions('income')}</option>
                    </select>
                    <select
                      value={row.categoryKey || ''}
                      onChange={(event) => updateRow(row.id, { categoryKey: event.target.value })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    >
                      {filteredCategories.map((category) => (
                        <option key={category.id} value={category.key}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center justify-between gap-2 md:justify-end">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        (row.confidence || 0) >= 0.9
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {tSettings('betaConfidence')} {Math.round((row.confidence || 0) * 100)}%
                      </span>
                      {duplicateState.has(row.id) ? (
                        <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          중복 후보
                        </span>
                      ) : null}
                      <button type="button" onClick={() => removeRow(row.id)} className="text-slate-400 transition-colors hover:text-rose-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <span>{tSettings('betaSourceLabel')}</span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm">{row.source}</span>
                    {row.categoryKey ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm">
                        {categoryMap.get(row.categoryKey)?.name || row.categoryName || row.categoryKey}
                      </span>
                    ) : null}
                    {duplicateState.get(row.id) ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-rose-700 shadow-sm">
                        {duplicateState.get(row.id)}
                      </span>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
