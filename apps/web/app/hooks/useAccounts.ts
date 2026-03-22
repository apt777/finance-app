import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

const fetchAccounts = async (): Promise<Account[]> => {
  const res = await fetch('/api/accounts')
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export const useAccounts = () => {
  const { user, loading } = useAuth()
  return useQuery<Account[]>({
    queryKey: ['accounts'],
    queryFn: fetchAccounts,
    enabled: !!user && !loading,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 30,
    placeholderData: keepPreviousData,
  })
}
