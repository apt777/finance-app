import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface AnalysisSummary {
  monthly: Array<{ month: string; income: number; expense: number; net: number }>
  yearly: Array<{ year: number; income: number; expense: number; net: number }>
  exchangeMonthly: Array<{ month: string; fromAmount: number; toAmount: number; count: number }>
  topCategories: Array<{ key: string; name: string; amount: number }>
  monthlyCategoryBreakdown: Array<{
    month: string
    categories: Array<{ key: string; name: string; amount: number }>
  }>
  baseCurrency: string
  budgetStatus: Array<{
    id: string
    name: string
    categoryKey?: string | null
    amount: number
    currency: string
    alertThreshold: number
    actual: number
    usagePercentage: number
  }>
}

async function fetchAnalysisSummary(): Promise<AnalysisSummary> {
  const response = await fetch('/api/analysis/summary')

  if (!response.ok) {
    throw new Error('Failed to fetch analysis summary')
  }

  return response.json()
}

export function useAnalysisSummary() {
  const { user, loading } = useAuth()

  return useQuery<AnalysisSummary>({
    queryKey: ['analysis-summary'],
    queryFn: fetchAnalysisSummary,
    enabled: !!user && !loading,
  })
}
