'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAccounts } from '@/hooks/useAccounts'
import AppLoadingState from '@/components/AppLoadingState'
import TransactionList from '@/components/TransactionList'
import CreditCardPaymentPlan from '@/components/CreditCardPaymentPlan'
import AccountTransactionDiagnostics from '@/components/AccountTransactionDiagnostics'

export default function AccountTransactionsPage() {
  const params = useParams()
  const tAccounts = useTranslations('accounts')
  const tCommon = useTranslations('common')
  const id = params.id as string
  const { data: accounts = [], isLoading } = useAccounts()

  if (!id) {
    return <div>{tCommon('error')}</div>
  }

  if (isLoading) {
    return <AppLoadingState label={tAccounts('title')} />
  }

  const account = accounts.find((item) => item.id === id)

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-white/80 bg-white/70 p-6 shadow-[0_18px_60px_rgba(148,163,184,0.14)] backdrop-blur-xl">
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">
          {account ? `${account.name} · ${Math.round(account.balance).toLocaleString()} ${account.currency}` : `${tAccounts('accountName')}: ${id}`}
        </h1>
        <p className="mt-2 text-sm text-slate-500">{tAccounts('accountDetailDesc')}</p>
      </div>
      {account?.type === 'credit_card' ? (
        <CreditCardPaymentPlan accountId={id} currency={account.currency} />
      ) : null}
      <AccountTransactionDiagnostics accountId={id} />
      <TransactionList accountId={id} />
    </div>
  )
}
