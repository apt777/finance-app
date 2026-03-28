'use client'

import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthProviderClient'

export interface UserEntitlements {
  plan: 'free' | 'plus'
  features: string[]
}

async function fetchEntitlements(): Promise<UserEntitlements> {
  const response = await fetch('/api/me/entitlements')
  if (!response.ok) {
    throw new Error('Failed to fetch entitlements')
  }
  return response.json()
}

export function useEntitlements() {
  const { user, loading } = useAuth()

  return useQuery<UserEntitlements>({
    queryKey: ['entitlements'],
    queryFn: fetchEntitlements,
    enabled: !!user && !loading,
    staleTime: 60_000,
  })
}
