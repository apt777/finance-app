import { useQueries } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

// Define interfaces for data structures (should match Prisma models)
interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

interface Transaction {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currency: string;
}

interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
}

interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

interface OverviewDataResult {
  accounts: Account[];
  transactions: Transaction[];
  holdings: Holding[];
  goals: Goal[];
}

const fetchAccounts = async (): Promise<Account[]> => {
  const res = await fetch('/api/accounts')
  if (!res.ok) throw new Error('Failed to fetch accounts')
  return res.json()
}

const fetchTransactions = async (): Promise<Transaction[]> => {
  const res = await fetch('/api/transactions')
  if (!res.ok) throw new Error('Failed to fetch transactions')
  return res.json()
}

const fetchHoldings = async (): Promise<Holding[]> => {
  const res = await fetch('/api/holdings')
  if (!res.ok) throw new Error('Failed to fetch holdings')
  return res.json()
}

const fetchGoals = async (): Promise<Goal[]> => {
  const res = await fetch('/api/goals')
  if (!res.ok) throw new Error('Failed to fetch goals')
  return res.json()
}

export const useOverviewData = () => {
  const { user, loading } = useAuth()
  const isEnabled = !!user && !loading

  const results = useQueries({
    queries: [
      { queryKey: ['accounts'], queryFn: fetchAccounts, enabled: isEnabled },
      { queryKey: ['transactions'], queryFn: fetchTransactions, enabled: isEnabled },
      { queryKey: ['holdings'], queryFn: fetchHoldings, enabled: isEnabled },
      { queryKey: ['goals'], queryFn: fetchGoals, enabled: isEnabled },
    ],
  })

  const isLoading = results.some((query) => query.isLoading)
  const isError = results.some((query) => query.isError)

  // Type assertions for data from useQueries results
  const data: OverviewDataResult = {
    accounts: (results[0].data as Account[]) || [],
    transactions: (results[1].data as Transaction[]) || [],
    holdings: (results[2].data as Holding[]) || [],
    goals: (results[3].data as Goal[]) || [],
  }

  return { data, isLoading, isError }
}