import { useQuery } from '@tanstack/react-query'

interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

const fetchExchangeRates = async (): Promise<ExchangeRate[]> => {
  const res = await fetch('/api/exchange-rates')
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export const useExchangeRates = () => {
  return useQuery<ExchangeRate[]>({
    queryKey: ['exchangeRates'],
    queryFn: fetchExchangeRates,
  })
}