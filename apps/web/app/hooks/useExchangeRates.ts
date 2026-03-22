import { keepPreviousData, useQuery } from '@tanstack/react-query'; import { useAuth } from '@/context/AuthProviderClient'

export interface ExchangeRate {
  id: string;
  userId: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const fetchExchangeRates = async (): Promise<ExchangeRate[]> => {
  try {
    const res = await fetch('/api/exchange-rates')

    if (!res.ok) {
      console.error(`[overview] failed to fetch exchange rates: ${res.status}`)
      return []
    }

    return res.json()
  } catch (error) {
    console.error('[overview] failed to fetch exchange rates:', error)
    return []
  }
}

export const useExchangeRates = () => {
  const { user, loading } = useAuth()
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: fetchExchangeRates,
    enabled: !!user && !loading,
    staleTime: 1000 * 60 * 60, // 1시간
    gcTime: 1000 * 60 * 60 * 24, // 24시간
    placeholderData: keepPreviousData,
  })
}
