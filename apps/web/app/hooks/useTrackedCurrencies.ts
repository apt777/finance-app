import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export const DEFAULT_TRACKED_CURRENCIES = ['JPY', 'USD', 'KRW']

async function fetchTrackedCurrencies(): Promise<string[]> {
  const response = await fetch('/api/preferences/currencies')

  if (!response.ok) {
    return DEFAULT_TRACKED_CURRENCIES
  }

  const data = await response.json()
  return Array.isArray(data?.trackedCurrencies) ? data.trackedCurrencies : DEFAULT_TRACKED_CURRENCIES
}

async function saveTrackedCurrencies(trackedCurrencies: string[]) {
  const response = await fetch('/api/preferences/currencies', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ trackedCurrencies }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({ error: 'Failed to update tracked currencies' }))
    throw new Error(data.error || 'Failed to update tracked currencies')
  }

  return response.json()
}

export function useTrackedCurrencies() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<string[]>({
    queryKey: ['trackedCurrencies'],
    queryFn: fetchTrackedCurrencies,
    enabled: !!user && !loading,
    staleTime: 1000 * 60 * 30,
  })

  const mutation = useMutation({
    mutationFn: saveTrackedCurrencies,
    onSuccess: (data) => {
      queryClient.setQueryData(['trackedCurrencies'], data.trackedCurrencies)
      queryClient.invalidateQueries({ queryKey: ['exchangeRates'] })
    },
  })

  return {
    trackedCurrencies: query.data || DEFAULT_TRACKED_CURRENCIES,
    isLoading: query.isLoading,
    isError: query.isError,
    updateTrackedCurrencies: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
