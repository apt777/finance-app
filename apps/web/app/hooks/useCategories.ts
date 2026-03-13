import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface TransactionCategory {
  id: string
  key: string
  name: string
  icon?: string | null
  color?: string | null
  type: 'income' | 'expense' | 'transfer'
  isDefault: boolean
}

async function fetchCategories(): Promise<TransactionCategory[]> {
  const response = await fetch('/api/categories')

  if (!response.ok) {
    throw new Error('Failed to fetch categories')
  }

  return response.json()
}

export function useCategories() {
  const { user, loading } = useAuth()

  return useQuery<TransactionCategory[]>({
    queryKey: ['categories'],
    queryFn: fetchCategories,
    enabled: !!user && !loading,
  })
}
