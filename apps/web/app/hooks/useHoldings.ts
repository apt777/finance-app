import { useQuery } from '@tanstack/react-query'

interface Holding {
  id: string;
  accountId: string;
  symbol: string;
  shares: number;
  costBasis: number;
  currency: string;
}

const fetchHoldings = async (): Promise<Holding[]> => {
  const res = await fetch('/api/holdings')
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export const useHoldings = () => {
  return useQuery<Holding[]>({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
  })
}