'use client'

import { Plus, ReceiptText } from 'lucide-react'
import TransactionList from '@/components/TransactionList'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'

export default function TransactionsPage() {
  const tTransactions = useTranslations('transactions')

  return (
    <div className="space-y-6 pb-10 md:pb-12">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ReceiptText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{tTransactions('title')}</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">{tTransactions('title')}</h1>
              <p className="mt-2 text-sm text-slate-500">{tTransactions('searchPlaceholder')}</p>
            </div>
          </div>
          <Link
            href="/transactions/add"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white shadow-md transition-all hover:bg-slate-800"
          >
            <Plus className="h-5 w-5" />
            <span>{tTransactions('addTransaction')}</span>
          </Link>
        </div>
      </div>
      <TransactionList />
    </div>
  )
}
