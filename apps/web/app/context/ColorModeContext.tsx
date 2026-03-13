'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type ColorMode = 'light' | 'dark'

interface ColorModeContextValue {
  colorMode: ColorMode
  setColorMode: (mode: ColorMode) => void
  mounted: boolean
}

const STORAGE_KEY = 'kablus-color-mode'

const ColorModeContext = createContext<ColorModeContextValue | undefined>(undefined)

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [colorMode, setColorModeState] = useState<ColorMode>('light')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedMode = window.localStorage.getItem(STORAGE_KEY)
    if (savedMode === 'light' || savedMode === 'dark') {
      setColorModeState(savedMode)
    }
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, colorMode)
    document.documentElement.dataset.colorMode = colorMode
  }, [colorMode, mounted])

  const value = useMemo(
    () => ({
      colorMode,
      mounted,
      setColorMode: setColorModeState,
    }),
    [colorMode, mounted]
  )

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
}

export function useColorMode() {
  const context = useContext(ColorModeContext)

  if (!context) {
    throw new Error('useColorMode must be used within ColorModeProvider')
  }

  return context
}
