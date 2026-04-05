'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAccounts } from '@/hooks/useAccounts'
import { useAuth } from '@/context/AuthProviderClient'
import AppLoadingState from '@/components/AppLoadingState'
import TransactionList from '@/components/TransactionList'
import CreditCardPaymentPlan from '@/components/CreditCardPaymentPlan'
import AccountTransactionDiagnostics from '@/components/AccountTransactionDiagnostics'

const DIAGNOSTIC_USER_ID = '9d2a6dd8-60a1-478a-af54-605d05cc2256'

export default function AccountTransactionsPage() {
  const params = useParams()
  const tAccounts = useTranslations('accounts')
  const tCommon = useTranslations('common')
  const { user } = useAuth()
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
      {user?.id === DIAGNOSTIC_USER_ID ? <AccountTransactionDiagnostics accountId={id} /> : null}
      <TransactionList accountId={id} />
    </div>
  )
}
