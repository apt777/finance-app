import { useQuery } from '@tanstack/react-query'; import { useAuth } from '@/context/AuthProviderClient'

interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetCurrency: string;
  targetDate?: string;
  priority: number;
}

const fetchGoals = async (): Promise<Goal[]> => {
  const res = await fetch('/api/goals')
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export const useGoals = () => {
  const { user, loading } = useAuth()
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: fetchGoals,
    enabled: !!user && !loading,
  })
}