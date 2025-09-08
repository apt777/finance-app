'use client'

import React from 'react'
import { useTransactions } from '../hooks/useTransactions'

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
}

const TransactionList = ({ accountId }: { accountId: string }) => {
  const { data, error, isLoading } = useTransactions(accountId)

  if (isLoading) return <div>Loading transactions...</div>
  if (error) return <div>Error fetching transactions</div>

  const transactions: Transaction[] = (data as Transaction[]) || []

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Transaction List</h2>
      {transactions.length > 0 ? (
        <ul>
          {transactions.map((transaction: Transaction) => (
            <li key={transaction.id}>{transaction.description}: {transaction.amount}</li>
          ))}
        </ul>
      ) : (
        <p>No transactions found.</p>
      )}
    </div>
  )
}

export default TransactionList