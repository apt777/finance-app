import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface PlannedCashflowMonth {
  month: string
  expectedIncome: number
  recurringIncome: number
  recurringExpense: number
  cardPayments: number
  totalIncoming: number
  totalOutgoing: number
  net: number
  projectedBalance: number
}

export interface PlannedCashflowForecast {
  baseCurrency: string
  openingBalance: number
  expectedIncomeByCurrency: Record<string, Record<string, number>>
  months: PlannedCashflowMonth[]
}

async function fetchPlannedCashflowForecast(baseCurrency: string): Promise<PlannedCashflowForecast> {
  const response = await fetch(`/api/forecast/planned-cashflow?baseCurrency=${encodeURIComponent(baseCurrency)}`)

  if (!response.ok) {
    throw new Error('Failed to fetch planned cashflow forecast')
  }

  return response.json()
}

export function usePlannedCashflowForecast(baseCurrency: string) {
  const { user, loading } = useAuth()

  return useQuery<PlannedCashflowForecast>({
    queryKey: ['planned-cashflow-forecast', baseCurrency],
    queryFn: () => fetchPlannedCashflowForecast(baseCurrency),
    enabled: !!user && !loading,
  })
}
