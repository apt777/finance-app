'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export interface QuickActionItem {
  id: string
  label: string
  type: 'expense' | 'income' | 'transfer'
  description: string
  categoryKey?: string
  notes?: string
  accountId?: string
  fromAccountId?: string
  toAccountId?: string
}

async function fetchQuickActions(): Promise<QuickActionItem[]> {
  const response = await fetch('/api/preferences/quick-actions')
  const data = await response.json()
  return Array.isArray(data?.quickActions) ? data.quickActions : []
}

async function saveQuickActions(quickActions: QuickActionItem[]) {
  const response = await fetch('/api/preferences/quick-actions', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ quickActions }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Failed to save quick actions')
  }

  const data = await response.json()
  return Array.isArray(data?.quickActions) ? data.quickActions : quickActions
}

export function useQuickActions() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['quickActions'],
    queryFn: fetchQuickActions,
  })

  const mutation = useMutation({
    mutationFn: saveQuickActions,
    onSuccess: (data) => {
      queryClient.setQueryData(['quickActions'], data)
    },
  })

  return {
    quickActions: query.data || [],
    isLoading: query.isLoading,
    isSaving: mutation.isPending,
    error: query.error || mutation.error,
    saveQuickActions: mutation.mutateAsync,
  }
}
