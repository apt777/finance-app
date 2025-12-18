'use client'

import { useParams } from 'next/navigation'
import TransactionList from '../../../components/TransactionList'

export default function AccountTransactionsPage() {
  const params = useParams()
  const id = params.id as string

  if (!id) {
    return <div>Account not found.</div>
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Transactions for Account: {id}</h1>
      <TransactionList accountId={id} />
    </div>
  )
}