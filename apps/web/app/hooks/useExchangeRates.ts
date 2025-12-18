import { useQuery } from '@tanstack/react-query'

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated?: string;
}

const fetchExchangeRates = async (): Promise<ExchangeRate[]> => {
  const res = await fetch('/api/exchange-rates')
  if (!res.ok) {
    throw new Error('환율 정보를 불러오는 중 오류 발생')
  }
  return res.json()
}

export const useExchangeRates = () => {
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: fetchExchangeRates,
    staleTime: 1000 * 60 * 60, // 1시간
    gcTime: 1000 * 60 * 60 * 24, // 24시간
  })
}