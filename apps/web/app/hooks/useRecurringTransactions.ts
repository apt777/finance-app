import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface RecurringTransaction {
  id: string
  name: string
  description: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency: string
  categoryKey?: string | null
  account?: { id: string; name: string } | null
  fromAccount?: { id: string; name: string } | null
  toAccount?: { id: string; name: string } | null
  interval: string
  dayOfMonth?: number | null
  dayOfWeek?: number | null
  startDate: string
  nextRunDate?: string | null
  isActive: boolean
}

async function fetchRecurringTransactions(): Promise<RecurringTransaction[]> {
  const response = await fetch('/api/recurring-transactions')

  if (!response.ok) {
    throw new Error('Failed to fetch recurring transactions')
  }

  return response.json()
}

export function useRecurringTransactions() {
  const { user, loading } = useAuth()

  return useQuery<RecurringTransaction[]>({
    queryKey: ['recurring-transactions'],
    queryFn: fetchRecurringTransactions,
    enabled: !!user && !loading,
  })
}
