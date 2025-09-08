import { useQuery } from '@tanstack/react-query'

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
}

const fetchTransactions = async (accountId: string): Promise<Transaction[]> => {
  const res = await fetch(`/api/accounts/${accountId}/transactions`)
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export const useTransactions = (accountId: string) => {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', accountId],
    queryFn: () => fetchTransactions(accountId),
  })
}