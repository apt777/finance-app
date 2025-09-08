'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react'
import { createClient, SupabaseClient, User } from '@supabase/supabase-js'

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
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  // Initialize Supabase client only once on the client side
  useEffect(() => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase URL or Anon Key environment variables. Authentication will not work.')
      setLoading(false); // Stop loading, but auth won't work
      return;
    }
    setSupabase(createClient(supabaseUrl, supabaseAnonKey));
  }, []);

  useEffect(() => {
    if (!supabase) return; // Don't proceed if supabase client isn't initialized

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null)
        setLoading(false)
      }
    )

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      setLoading(false)
    })

    return () => {
      authListener?.subscription?.unsubscribe()
    }
  }, [supabase]) // Depend on supabase client initialization

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase client not initialized.') };
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    if (!supabase) return { error: new Error('Supabase client not initialized.') };
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    if (!supabase) return { error: new Error('Supabase client not initialized.') };
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  // Memoize the context value to prevent unnecessary re-renders
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