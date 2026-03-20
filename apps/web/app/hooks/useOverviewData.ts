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

const fetchListOrEmpty = async <T>(url: string, label: string): Promise<T[]> => {
  try {
    const res = await fetch(url)

    if (!res.ok) {
      console.error(`[overview] failed to fetch ${label}: ${res.status}`)
      return []
    }

    return res.json()
  } catch (error) {
    console.error(`[overview] failed to fetch ${label}:`, error)
    return []
  }
}

const fetchAccounts = async (): Promise<Account[]> => {
  return fetchListOrEmpty<Account>('/api/accounts', 'accounts')
}

const fetchTransactions = async (): Promise<Transaction[]> => {
  return fetchListOrEmpty<Transaction>('/api/transactions', 'transactions')
}

const fetchHoldings = async (): Promise<Holding[]> => {
  return fetchListOrEmpty<Holding>('/api/holdings', 'holdings')
}

const fetchGoals = async (): Promise<Goal[]> => {
  return fetchListOrEmpty<Goal>('/api/goals', 'goals')
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
  const isError = false

  // Type assertions for data from useQueries results
  const data: OverviewDataResult = {
    accounts: (results[0].data as Account[]) || [],
    transactions: (results[1].data as Transaction[]) || [],
    holdings: (results[2].data as Holding[]) || [],
    goals: (results[3].data as Goal[]) || [],
  }

  return { data, isLoading, isError }
}
