'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any | null }>
  signUp: (email: string, password: string) => Promise<{ error: any | null }>
  signOut: () => Promise<{ error: any | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // This client is safe to use in client components
  const supabase = useMemo(() => createClientComponentClient(), [])

  useEffect(() => {
    const handleAuthChange = async (event: string, session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      setUser(session?.user ?? null)
      setLoading(false)

      if (event === 'SIGNED_IN' && session?.user) {
        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              id: session.user.id,
              email: session.user.email,
              name: session.user.email, // Or a default name
            }),
          });
        } catch (e) {
          console.error("Error syncing user", e)
        }
      }
    }

    const { data: authListener } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange('INITIAL_SESSION', session);
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const contextValue = useMemo(() => ({ user, loading, signIn, signUp, signOut }), [user, loading, signIn, signUp, signOut]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
