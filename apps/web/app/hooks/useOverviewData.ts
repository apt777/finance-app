import { keepPreviousData, useQuery } from '@tanstack/react-query'
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
  name?: string | null;
  shares: number;
  costBasis: number;
  marketPrice?: number | null;
  currency: string;
  investmentType?: string;
  region?: string | null;
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

const fetchOverviewData = async (): Promise<OverviewDataResult> => {
  try {
    const res = await fetch('/api/overview')

    if (!res.ok) {
      console.error(`[overview] failed to fetch overview data: ${res.status}`)
      return {
        accounts: [],
        transactions: [],
        holdings: [],
        goals: [],
      }
    }

    return res.json()
  } catch (error) {
    console.error('[overview] failed to fetch overview data:', error)
    return {
      accounts: [],
      transactions: [],
      holdings: [],
      goals: [],
    }
  }
}

export const useOverviewData = () => {
  const { user, loading } = useAuth()
  const query = useQuery<OverviewDataResult>({
    queryKey: ['overview'],
    queryFn: fetchOverviewData,
    enabled: !!user && !loading,
    placeholderData: keepPreviousData,
  })

  return {
    data: query.data || {
      accounts: [],
      transactions: [],
      holdings: [],
      goals: [],
    },
    isLoading: query.isLoading,
    isError: query.isError,
  }
}
