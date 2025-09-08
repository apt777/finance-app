'use client'

import TransactionList from '../components/TransactionList'

export default function TransactionsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Transactions</h1>
      {/* TransactionList without accountId will fetch all transactions for the logged-in user */}
      <TransactionList />
    </div>
  )
}
