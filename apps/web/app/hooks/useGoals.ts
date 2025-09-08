import { useQuery } from '@tanstack/react-query'

interface Goal {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

const fetchGoals = async (): Promise<Goal[]> => {
  const res = await fetch('/api/goals')
  if (!res.ok) {
    throw new Error('Network response was not ok')
  }
  return res.json()
}

export const useGoals = () => {
  return useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: fetchGoals,
  })
}