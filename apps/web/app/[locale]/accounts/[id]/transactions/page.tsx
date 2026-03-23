'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAccounts } from '@/hooks/useAccounts'
import AppLoadingState from '@/components/AppLoadingState'
import TransactionList from '@/components/TransactionList'

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
    <div>
      <h1 className="mb-4 text-2xl font-bold">
        {account ? `${account.name} · ${Math.round(account.balance).toLocaleString()} ${account.currency}` : `${tAccounts('accountName')}: ${id}`}
      </h1>
      <TransactionList accountId={id} />
    </div>
  )
}
