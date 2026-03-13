import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface Budget {
  id: string
  name: string
  categoryKey?: string | null
  amount: number
  currency: string
  period: string
  year: number
  month?: number | null
  alertThreshold: number
}

async function fetchBudgets(): Promise<Budget[]> {
  const response = await fetch('/api/budgets')

  if (!response.ok) {
    throw new Error('Failed to fetch budgets')
  }

  return response.json()
}

export function useBudgets() {
  const { user, loading } = useAuth()

  return useQuery<Budget[]>({
    queryKey: ['budgets'],
    queryFn: fetchBudgets,
    enabled: !!user && !loading,
  })
}
