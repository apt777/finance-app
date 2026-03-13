import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

interface SetupStatus {
  completed: boolean
}

async function fetchSetupStatus(): Promise<SetupStatus> {
  const response = await fetch('/api/setup/status')

  if (!response.ok) {
    throw new Error('Failed to fetch setup status')
  }

  return response.json()
}

export function useOnboardingStatus() {
  const { user, loading } = useAuth()

  return useQuery<SetupStatus>({
    queryKey: ['setup-status'],
    queryFn: fetchSetupStatus,
    enabled: !!user && !loading,
    staleTime: 30_000,
  })
}
