'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type UiTheme = 'old' | 'modern'

interface UiThemeContextValue {
  theme: UiTheme
  setTheme: (theme: UiTheme) => void
  mounted: boolean
}

const STORAGE_KEY = 'kablus-ui-theme'

const UiThemeContext = createContext<UiThemeContextValue | undefined>(undefined)

export function UiThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<UiTheme>('modern')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY)
    if (savedTheme === 'old' || savedTheme === 'modern') {
      setThemeState(savedTheme)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, theme)
    document.documentElement.dataset.uiTheme = theme
  }, [mounted, theme])

  const value = useMemo(
    () => ({
      theme,
      mounted,
      setTheme: setThemeState,
    }),
    [mounted, theme]
  )

  return <UiThemeContext.Provider value={value}>{children}</UiThemeContext.Provider>
}

export function useUiTheme() {
  const context = useContext(UiThemeContext)

  if (!context) {
    throw new Error('useUiTheme must be used within UiThemeProvider')
  }

  return context
}
