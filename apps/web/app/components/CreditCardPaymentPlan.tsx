'use client'

import React from 'react'
import { CalendarDays } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { useAccounts } from '@/hooks/useAccounts'

function buildMonths() {
  const base = new Date()
  return Array.from({ length: 6 }).map((_, index) => {
    const next = new Date(base.getFullYear(), base.getMonth() + index, 1)
    const key = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
    return {
      key,
      label: `${next.getFullYear()}.${String(next.getMonth() + 1).padStart(2, '0')}`,
    }
  })
}

async function fetchPaymentPlan(accountId: string) {
  const response = await fetch(`/api/accounts/${accountId}/payment-plan`)
  const data = await response.json()
  return {
    paymentPlan: data?.paymentPlan && typeof data.paymentPlan === 'object' ? data.paymentPlan : {},
    paymentSettings: data?.paymentSettings && typeof data.paymentSettings === 'object' ? data.paymentSettings : {},
  }
}

async function savePaymentPlan(
  accountId: string,
  payload: {
    paymentPlan: Record<string, string>
    paymentSettings: {
      paymentLoggingMode: 'planned_only' | 'separate_transfer'
      paymentSourceAccountId: string
      paymentDayOfMonth: string
    }
  }
) {
  const response = await fetch(`/api/accounts/${accountId}/payment-plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Failed to save payment plan')
  }
  return response.json()
}

export default function CreditCardPaymentPlan({ accountId, currency }: { accountId: string; currency: string }) {
  const tAccounts = useTranslations('accounts')
  const tCommon = useTranslations('common')
  const queryClient = useQueryClient()
  const { data: accounts = [] } = useAccounts()
  const months = React.useMemo(() => buildMonths(), [])
  const query = useQuery({
    queryKey: ['creditCardPaymentPlan', accountId],
    queryFn: () => fetchPaymentPlan(accountId),
  })
  const [draft, setDraft] = React.useState<Record<string, string>>({})
  const [paymentSettings, setPaymentSettings] = React.useState({
    paymentLoggingMode: 'planned_only' as 'planned_only' | 'separate_transfer',
    paymentSourceAccountId: '',
    paymentDayOfMonth: '',
  })

  React.useEffect(() => {
    setDraft(query.data?.paymentPlan || {})
    setPaymentSettings({
      paymentLoggingMode: query.data?.paymentSettings?.paymentLoggingMode === 'separate_transfer' ? 'separate_transfer' : 'planned_only',
      paymentSourceAccountId: query.data?.paymentSettings?.paymentSourceAccountId || '',
      paymentDayOfMonth: query.data?.paymentSettings?.paymentDayOfMonth ? String(query.data.paymentSettings.paymentDayOfMonth) : '',
    })
  }, [query.data])

  const mutation = useMutation({
    mutationFn: (payload: {
      paymentPlan: Record<string, string>
      paymentSettings: {
        paymentLoggingMode: 'planned_only' | 'separate_transfer'
        paymentSourceAccountId: string
        paymentDayOfMonth: string
      }
    }) => savePaymentPlan(accountId, payload),
    onSuccess: (data) => {
      queryClient.setQueryData(['creditCardPaymentPlan', accountId], {
        paymentPlan: data.paymentPlan || {},
        paymentSettings: data.paymentSettings || {},
      })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['planned-cashflow-forecast'] })
    },
  })

  const currentMonthKey = months[0]?.key || ''
  const currentMonthPlannedAmount = Number(draft[currentMonthKey] || query.data?.paymentPlan?.[currentMonthKey] || 0)
  const sourceAccounts = accounts.filter((account: any) => account.id !== accountId && account.type !== 'credit_card')
  const selectedSourceAccount = sourceAccounts.find((account: any) => account.id === paymentSettings.paymentSourceAccountId)
  const paymentRegistrationParams = new URLSearchParams({
    type: 'transfer',
    fromAccountId: paymentSettings.paymentSourceAccountId,
    toAccountId: accountId,
    amount: String(Math.max(0, Math.round(currentMonthPlannedAmount))),
    description: tAccounts('recordActualCardPaymentDesc'),
  })

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">{tAccounts('monthlyPaymentPlan')}</h2>
          <p className="mt-1 text-sm text-slate-500">{tAccounts('monthlyPaymentPlanDesc')}</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {months.map((month) => (
          <label key={month.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <span className="block text-sm font-semibold text-slate-800">{month.label}</span>
            <div className="relative mt-3">
              <input
                type="number"
                min="0"
                value={draft[month.key] || ''}
                onChange={(event) => setDraft((current) => ({ ...current, [month.key]: event.target.value }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-16 text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <span className="absolute right-4 top-3 text-sm font-semibold text-slate-500">{currency}</span>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="text-sm">
          {currentMonthKey ? (
            <p className="mb-1 text-slate-500">
              {months[0]?.label} · {currentMonthPlannedAmount > 0 ? `${Math.round(currentMonthPlannedAmount).toLocaleString()} ${currency}` : '-'}
            </p>
          ) : null}
          {mutation.isSuccess ? <span className="text-emerald-600">{tAccounts('paymentPlanSaved')}</span> : null}
          {mutation.isError ? <span className="text-rose-600">{tCommon('error')}</span> : null}
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate({ paymentPlan: draft, paymentSettings })}
          disabled={mutation.isPending}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? tCommon('loading') : tCommon('save')}
        </button>
      </div>

      <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-base font-black tracking-[-0.03em] text-slate-950">{tAccounts('actualCardPaymentTracking')}</h3>
        <p className="mt-1 text-sm text-slate-500">{tAccounts('actualCardPaymentTrackingDesc')}</p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className={`rounded-2xl border p-4 ${paymentSettings.paymentLoggingMode === 'planned_only' ? 'border-slate-950 bg-white' : 'border-slate-200 bg-white'}`}>
            <input
              type="radio"
              name="paymentLoggingMode"
              className="sr-only"
              checked={paymentSettings.paymentLoggingMode === 'planned_only'}
              onChange={() => setPaymentSettings((current) => ({ ...current, paymentLoggingMode: 'planned_only' }))}
            />
            <span className="block text-sm font-semibold text-slate-900">{tAccounts('paymentLoggingModePlannedOnly')}</span>
            <span className="mt-1 block text-xs text-slate-500">{tAccounts('paymentLoggingModePlannedOnlyDesc')}</span>
          </label>
          <label className={`rounded-2xl border p-4 ${paymentSettings.paymentLoggingMode === 'separate_transfer' ? 'border-slate-950 bg-white' : 'border-slate-200 bg-white'}`}>
            <input
              type="radio"
              name="paymentLoggingMode"
              className="sr-only"
              checked={paymentSettings.paymentLoggingMode === 'separate_transfer'}
              onChange={() => setPaymentSettings((current) => ({ ...current, paymentLoggingMode: 'separate_transfer' }))}
            />
            <span className="block text-sm font-semibold text-slate-900">{tAccounts('paymentLoggingModeSeparateTransfer')}</span>
            <span className="mt-1 block text-xs text-slate-500">{tAccounts('paymentLoggingModeSeparateTransferDesc')}</span>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{tAccounts('paymentSourceAccount')}</span>
            <select
              value={paymentSettings.paymentSourceAccountId}
              onChange={(event) => setPaymentSettings((current) => ({ ...current, paymentSourceAccountId: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{tAccounts('paymentSourceAccountPlaceholder')}</option>
              {sourceAccounts.map((account: any) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-800">{tAccounts('paymentDayOfMonth')}</span>
            <input
              type="number"
              min="1"
              max="31"
              value={paymentSettings.paymentDayOfMonth}
              onChange={(event) => setPaymentSettings((current) => ({ ...current, paymentDayOfMonth: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
              placeholder="27"
            />
          </label>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{tAccounts('actualCardPaymentGuidanceTitle')}</p>
          <p className="mt-1">{tAccounts('actualCardPaymentGuidanceBody')}</p>
          {paymentSettings.paymentLoggingMode === 'separate_transfer' && selectedSourceAccount && currentMonthPlannedAmount > 0 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {tAccounts('actualCardPaymentHelperMeta', {
                  account: selectedSourceAccount.name,
                  amount: Math.round(currentMonthPlannedAmount).toLocaleString(),
                  currency,
                })}
              </p>
              <Link
                href={`/transactions/add?${paymentRegistrationParams.toString()}`}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-slate-800"
              >
                {tAccounts('recordActualCardPayment')}
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
