import { useQuery } from '@tanstack/react-query'; import { useAuth } from '@/context/AuthProviderClient'

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
  const res = await fetch('/api/exchange-rates')
  if (!res.ok) {
    throw new Error('환율 정보를 불러오는 중 오류 발생')
  }
  return res.json()
}

export const useExchangeRates = () => {
  const { user, loading } = useAuth()
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: fetchExchangeRates,
    enabled: !!user && !loading,
    staleTime: 1000 * 60 * 60, // 1시간
    gcTime: 1000 * 60 * 60 * 24, // 24시간
  })
}
