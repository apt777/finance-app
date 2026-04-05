'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Bug } from 'lucide-react'
import { useLocale } from 'next-intl'

interface DiagnosticsResponse {
  account: {
    id: string
    name: string
    currency: string
    type: string
    balance: number
  }
  counts: {
    direct: number
    from: number
    to: number
    total: number
  }
  duplicateNamedAccounts: Array<{
    id: string
    name: string
    currency: string
    type: string
    balance: number
  }>
  monthlySummary: Array<{
    month: string
    direct: number
    from: number
    to: number
    total: number
  }>
  linkedTransactions: Array<{
    id: string
    date: string
    description: string
    type: string
    amount: number
    currency: string
    accountId: string | null
    fromAccountId: string | null
    toAccountId: string | null
  }>
}

const copy = {
  ko: {
    title: '거래 연결 진단',
    subtitle: '이 계좌 id에 실제로 연결된 거래 건수를 확인합니다.',
    show: '진단 보기',
    hide: '진단 숨기기',
    direct: '직접 기록',
    from: '출금 계좌',
    to: '입금 계좌',
    total: '총 연결 건수',
    sameName: '같은 이름 계좌',
    none: '없음',
    recent: '최근 연결 거래',
    monthly: '월별 연결 요약',
    helper: '여기 숫자가 적게 나오면, 문제 거래가 다른 account id에 연결돼 있을 가능성이 큽니다.',
  },
  en: {
    title: 'Transaction link diagnostics',
    subtitle: 'Checks how many transactions are actually linked to this account id.',
    show: 'Show diagnostics',
    hide: 'Hide diagnostics',
    direct: 'Direct entries',
    from: 'From account',
    to: 'To account',
    total: 'Total linked',
    sameName: 'Accounts with same name',
    none: 'None',
    recent: 'Recent linked transactions',
    monthly: 'Monthly link summary',
    helper: 'If these counts are lower than expected, some transfers may be linked to a different account id.',
  },
  ja: {
    title: '取引リンク診断',
    subtitle: 'この口座 id に実際に紐づいている取引件数を確認します。',
    show: '診断を表示',
    hide: '診断を閉じる',
    direct: '直接記録',
    from: '出金口座',
    to: '入金口座',
    total: '合計リンク件数',
    sameName: '同名の口座',
    none: 'なし',
    recent: '最近のリンク取引',
    monthly: '月別リンク集計',
    helper: 'ここが想定より少ない場合、問題の取引が別の口座 id に紐づいている可能性があります。',
  },
  zh: {
    title: '交易关联诊断',
    subtitle: '查看真正关联到这个账户 id 的交易数量。',
    show: '查看诊断',
    hide: '收起诊断',
    direct: '直接记录',
    from: '转出账户',
    to: '转入账户',
    total: '关联总数',
    sameName: '同名账户',
    none: '无',
    recent: '最近关联交易',
    monthly: '按月汇总',
    helper: '如果这里的数量明显偏少，问题交易很可能被连接到了其他 account id。',
  },
} as const

async function fetchDiagnostics(accountId: string) {
  const response = await fetch(`/api/accounts/${accountId}/transactions/diagnostics`)
  if (!response.ok) {
    throw new Error('Failed to load diagnostics')
  }
  return response.json() as Promise<DiagnosticsResponse>
}

export default function AccountTransactionDiagnostics({ accountId }: { accountId: string }) {
  const locale = useLocale() as keyof typeof copy
  const text = copy[locale] || copy.ko
  const [open, setOpen] = React.useState(false)
  const query = useQuery({
    queryKey: ['account-transaction-diagnostics', accountId],
    queryFn: () => fetchDiagnostics(accountId),
    enabled: open,
    staleTime: 1000 * 60,
  })

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
            <Bug className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{text.title}</p>
            <p className="mt-1 text-xs leading-6 text-slate-500">{text.subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
        >
          {open ? text.hide : text.show}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {open ? (
        <div className="mt-4 space-y-4">
          {query.isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">Loading...</div>
          ) : query.isError || !query.data ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">Failed to load diagnostics.</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  [text.direct, query.data.counts.direct],
                  [text.from, query.data.counts.from],
                  [text.to, query.data.counts.to],
                  [text.total, query.data.counts.total],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
                    <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-500">
                {text.helper}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{text.sameName}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {query.data.duplicateNamedAccounts.length > 0 ? query.data.duplicateNamedAccounts.map((account) => (
                    <span key={account.id} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                      {account.name} · {account.currency} · {account.id.slice(0, 8)}
                    </span>
                  )) : <span className="text-sm text-slate-500">{text.none}</span>}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{text.monthly}</p>
                  <div className="mt-3 space-y-2">
                    {query.data.monthlySummary.map((item) => (
                      <div key={item.month} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <span>{item.month}</span>
                        <span className="text-xs text-slate-500">D {item.direct} / F {item.from} / T {item.to} / Σ {item.total}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{text.recent}</p>
                  <div className="mt-3 space-y-2">
                    {query.data.linkedTransactions.slice(0, 8).map((transaction) => (
                      <div key={transaction.id} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{transaction.description}</span>
                          <span className="shrink-0 text-xs text-slate-500">{new Date(transaction.date).toLocaleDateString()}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          account {transaction.accountId?.slice(0, 8) || '-'} / from {transaction.fromAccountId?.slice(0, 8) || '-'} / to {transaction.toAccountId?.slice(0, 8) || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}
