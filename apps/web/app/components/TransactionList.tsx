'use client'

import React from 'react'
import { useTransactions } from '../hooks/useTransactions'

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  type: string; // Added type field
  currency: string;
  account?: { // Optional account details for global transactions
    name: string;
    currency: string;
  };
}

// accountId is now optional
const TransactionList = ({ accountId }: { accountId?: string }) => {
  const { data, error, isLoading } = useTransactions(accountId)

  if (isLoading) return <div>Loading transactions...</div>
  if (error) return <div>Error fetching transactions</div>

  const transactions: Transaction[] = (data as Transaction[]) || []

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2">Transaction List</h2>
      {transactions.length > 0 ? (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th> {/* Added Type header */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
            </tr>
          </thead><tbody className="bg-white divide-y divide-gray-200">{transactions.map((transaction: Transaction) => (
              <tr key={transaction.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{new Date(transaction.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.type}</td> {/* Added Type data */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.amount.toFixed(2)} {transaction.currency}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{transaction.account?.name || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No transactions found.</p>
      )}
    </div>
  )
}

export default TransactionList