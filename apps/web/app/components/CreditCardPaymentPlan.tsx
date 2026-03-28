'use client'

import React from 'react'
import { CalendarDays } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'

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
  return data?.paymentPlan && typeof data.paymentPlan === 'object' ? data.paymentPlan : {}
}

async function savePaymentPlan(accountId: string, paymentPlan: Record<string, string>) {
  const response = await fetch(`/api/accounts/${accountId}/payment-plan`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ paymentPlan }),
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
  const months = React.useMemo(() => buildMonths(), [])
  const query = useQuery({
    queryKey: ['creditCardPaymentPlan', accountId],
    queryFn: () => fetchPaymentPlan(accountId),
  })
  const [draft, setDraft] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    setDraft(query.data || {})
  }, [query.data])

  const mutation = useMutation({
    mutationFn: (paymentPlan: Record<string, string>) => savePaymentPlan(accountId, paymentPlan),
    onSuccess: (data) => {
      queryClient.setQueryData(['creditCardPaymentPlan', accountId], data.paymentPlan || {})
    },
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

      <div className="mt-5 flex items-center justify-between">
        <div className="text-sm">
          {mutation.isSuccess ? <span className="text-emerald-600">{tAccounts('paymentPlanSaved')}</span> : null}
          {mutation.isError ? <span className="text-rose-600">{tCommon('error')}</span> : null}
        </div>
        <button
          type="button"
          onClick={() => mutation.mutate(draft)}
          disabled={mutation.isPending}
          className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending ? tCommon('loading') : tCommon('save')}
        </button>
      </div>
    </div>
  )
}
