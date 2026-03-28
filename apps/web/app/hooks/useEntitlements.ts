'use client'

import { useQuery } from '@tanstack/react-query'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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

async function updateEntitlements(plan: 'free' | 'plus'): Promise<UserEntitlements> {
  const response = await fetch('/api/me/entitlements', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plan }),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Failed to update entitlements')
  }
  return response.json()
}

export function useEntitlements() {
  const { user, loading } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery<UserEntitlements>({
    queryKey: ['entitlements'],
    queryFn: fetchEntitlements,
    enabled: !!user && !loading,
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: updateEntitlements,
    onSuccess: (data) => {
      queryClient.setQueryData(['entitlements'], data)
    },
  })

  return {
    ...query,
    setPlan: mutation.mutateAsync,
    isSaving: mutation.isPending,
  }
}
