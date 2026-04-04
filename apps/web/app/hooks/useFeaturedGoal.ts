import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

interface FeaturedGoalResponse {
  goalId: string | null
}

async function fetchFeaturedGoal(): Promise<FeaturedGoalResponse> {
  const response = await fetch('/api/preferences/featured-goal')

  if (!response.ok) {
    throw new Error('Failed to fetch featured goal')
  }

  return response.json()
}

async function updateFeaturedGoal(goalId: string | null): Promise<FeaturedGoalResponse> {
  const response = await fetch('/api/preferences/featured-goal', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ goalId }),
  })

  if (!response.ok) {
    throw new Error('Failed to update featured goal')
  }

  return response.json()
}

export function useFeaturedGoal() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<FeaturedGoalResponse>({
    queryKey: ['featured-goal'],
    queryFn: fetchFeaturedGoal,
    enabled: !!user && !loading,
  })

  const mutation = useMutation({
    mutationFn: updateFeaturedGoal,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-goal'] })
    },
  })

  return {
    ...query,
    goalId: query.data?.goalId || null,
    setFeaturedGoal: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
