import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface DashboardSummary {
  recurringByCurrency: Record<string, number>
  creditCardPaymentsByCurrency: Record<string, number>
  totalUpcomingCount: number
  totalCreditCardCount: number
}

async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const response = await fetch('/api/dashboard/summary')

  if (!response.ok) {
    throw new Error('Failed to fetch dashboard summary')
  }

  return response.json()
}

export function useDashboardSummary() {
  const { user, loading } = useAuth()

  return useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: fetchDashboardSummary,
    enabled: !!user && !loading,
  })
}
