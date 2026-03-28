'use client'

import React, { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Wand2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react'
import { useLocale, useTranslations } from 'next-intl'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { findDuplicateTransaction } from '@/lib/transactionDuplicates'
import { getUiCopy } from '@/lib/uiCopy'

interface ParsedRow {
  id: string
  source: string
  date?: string
  description?: string
  amount?: number
  type?: 'income' | 'expense' | 'transfer'
  accountId?: string | null
  accountName?: string | null
  categoryKey?: string | null
  categoryName?: string | null
  confidence?: number
  error?: string | null
}

const parseTransactions = async ({ input, defaultAccountId }: { input: string; defaultAccountId?: string }) => {
  const response = await fetch('/api/beta/transaction-bulk-parse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ input, defaultAccountId }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to parse transactions')
  }

  return response.json() as Promise<{ rows: ParsedRow[]; total: number }>
}

const createTransactionsBulk = async (rows: Array<{
  accountId: string
  date: string
  description: string
  type: 'income' | 'expense'
  amount: number
  currency: string
  categoryKey?: string | null
}>) => {
  const response = await fetch('/api/transactions/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ rows }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create transactions')
  }

  return response.json()
}

export default function AIBulkImportBeta() {
  const locale = useLocale()
  const tSettings = useTranslations('settings')
  const tTransactions = useTranslations('transactions')
  const tCommon = useTranslations('common')
  const ui = getUiCopy(locale)
  const duplicateDraftMessage =
    locale === 'en'
      ? 'Duplicate inside this draft list.'
      : locale === 'ja'
        ? 'この下書き一覧の中で重複しています。'
        : locale === 'zh'
          ? '与本次草稿列表中的交易重复。'
          : '이번 미리보기 목록 안에서 중복됩니다.'
  const duplicateBadgeLabel =
    locale === 'en'
      ? 'Possible duplicate'
      : locale === 'ja'
        ? '重複候補'
        : locale === 'zh'
          ? '疑似重复'
          : '중복 후보'
  const betaExampleText =
    locale === 'en'
      ? `3/1 Starbucks 5800
3/2 Salary 250000
3/3 Subway 1400`
      : locale === 'ja'
        ? `3/1 スターバックス 5800
3/2 給与 250000
3/3 電車 1400`
        : locale === 'zh'
          ? `3/1 星巴克 5800
3/2 工资 250000
3/3 地铁 1400`
          : `3/1 스타벅스 5800
3/2 월급 250000
3/3 전철 1400`
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const { data: categories = [] } = useCategories()
  const { data: existingTransactions = [] } = useTransactions()

  const [input, setInput] = useState('')
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const getEffectiveAccountId = (row: ParsedRow) => row.accountId || selectedAccountId
  const getEffectiveAccount = (row: ParsedRow) => accounts.find((account) => account.id === getEffectiveAccountId(row))
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
      const effectiveAccountId = getEffectiveAccountId(row)
      const effectiveAccount = accounts.find((account) => account.id === effectiveAccountId)

      if (!effectiveAccountId || row.error || row.type === 'transfer' || !row.date || !row.description || !row.amount || !row.type) {
        continue
      }

      const duplicateInExisting = findDuplicateTransaction(
        {
          accountId: effectiveAccountId,
          date: row.date,
          description: row.description,
          type: row.type,
          amount: Number(row.amount),
          currency: effectiveAccount?.currency,
        },
        existingTransactions
      )

      if (duplicateInExisting) {
        result.set(row.id, ui.transactionForm.duplicateError)
        continue
      }

      const duplicateInDraft = findDuplicateTransaction(
        {
          accountId: effectiveAccountId,
          date: row.date,
          description: row.description,
          type: row.type,
          amount: Number(row.amount),
          currency: effectiveAccount?.currency,
        },
        seenDraftRows
      )

      if (duplicateInDraft) {
        result.set(row.id, duplicateDraftMessage)
        continue
      }

      seenDraftRows.push({
        id: row.id,
        accountId: effectiveAccountId,
        date: row.date,
        description: row.description,
        type: row.type,
        amount: Number(row.amount),
      })
    }

    return result
  }, [accounts, existingTransactions, rows, selectedAccountId])
  const validRows = rows.filter((row) => !row.error && row.type !== 'transfer' && !duplicateState.has(row.id) && Boolean(getEffectiveAccountId(row)))

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
      const payload = validRows
        .map((row) => {
          if (!row.date || !row.description || !row.amount || !row.type || row.type === 'transfer') {
            return null
          }

          const targetAccount = getEffectiveAccount(row)
          if (!targetAccount) {
            return null
          }

          return {
            accountId: targetAccount.id,
            date: row.date,
            description: row.description,
            type: row.type,
            amount: Number(row.amount),
            currency: targetAccount.currency,
            categoryKey: row.categoryKey || undefined,
          }
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row))

      return createTransactionsBulk(payload)
    },
    onSuccess: ({ importedCount, skippedDuplicateCount }) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['analysis-summary'] })
      queryClient.invalidateQueries({ queryKey: ['overview'] })
      setFeedback(
        skippedDuplicateCount > 0
          ? (locale === 'en'
              ? `${importedCount} imported, ${skippedDuplicateCount} skipped as duplicates`
              : locale === 'ja'
                ? `${importedCount}件登録、${skippedDuplicateCount}件は重複のためスキップ`
                : locale === 'zh'
                  ? `已导入 ${importedCount} 条，${skippedDuplicateCount} 条因重复被跳过`
                  : `${importedCount}건 등록, ${skippedDuplicateCount}건 중복으로 건너뜀`)
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
{betaExampleText}
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

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
              {locale === 'en'
                ? 'Tip: type a date line like "date 3/1" or just "3/1", and the rows below will use that date until a new date line appears.'
                : locale === 'ja'
                  ? 'ヒント: 「date 3/1」や「3/1」のように日付だけの行を書くと、その下の行は次の日付行が出るまで同じ日付で処理されます。'
                  : locale === 'zh'
                    ? '提示：输入一行“date 3/1”或仅输入“3/1”，下面的记录会一直使用这个日期，直到出现新的日期行。'
                    : '팁: "date 3/1" 또는 "3/1"처럼 날짜만 적은 줄을 넣으면, 다음 날짜 줄이 나오기 전까지 아래 행들이 그 날짜로 처리됩니다.'}
            </div>

            <button
              type="button"
              onClick={() => parseMutation.mutate({ input, defaultAccountId: selectedAccountId || undefined })}
              disabled={!input.trim() || parseMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wand2 className="h-4 w-4" />
              {parseMutation.isPending ? tCommon('loading') : tSettings('betaParse')}
            </button>

            <button
              type="button"
              onClick={() => importMutation.mutate()}
              disabled={validRows.length === 0 || importMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-all hover:border-blue-300 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              {importMutation.isPending
                ? (locale === 'en'
                    ? `Saving ${validRows.length}`
                    : locale === 'ja'
                      ? `${validRows.length}件を保存中`
                      : locale === 'zh'
                        ? `正在保存 ${validRows.length} 条`
                        : `${validRows.length}건 저장 중`)
                : tSettings('betaImport')}
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
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-[150px_minmax(0,1fr)_140px_140px_180px_180px_auto] md:items-center">
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
                    <select
                      value={getEffectiveAccountId(row) || ''}
                      onChange={(event) => updateRow(row.id, { accountId: event.target.value || null })}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">{tSettings('betaSelectAccount')}</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency})
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
                          {duplicateBadgeLabel}
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
                    {getEffectiveAccount(row) ? (
                      <span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm">
                        {getEffectiveAccount(row)?.name}
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
