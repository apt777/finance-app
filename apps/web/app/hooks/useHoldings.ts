import { useQuery } from '@tanstack/react-query'; import { useAuth } from '@/context/AuthProviderClient'

export interface Holding {
  id: string
  symbol: string
  name?: string | null
  shares: number
  costBasis: number
  marketPrice?: number | null
  currency: string
  investmentType?: string
  region?: string | null
  createdAt?: string
  updatedAt?: string
  notes?: string
}

const fetchHoldings = async (): Promise<Holding[]> => {
  const res = await fetch('/api/holdings')
  if (!res.ok) {
    throw new Error('투자 데이터를 불러오는 중 오류 발생')
  }
  return res.json()
}

export const useHoldings = () => {
  const { user, loading } = useAuth()
  return useQuery<Holding[]>({
    queryKey: ['holdings'],
    queryFn: fetchHoldings,
    enabled: !!user && !loading,
    staleTime: 1000 * 60 * 5, // 5분
    gcTime: 1000 * 60 * 60, // 1시간
  })
}
