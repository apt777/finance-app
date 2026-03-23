'use client'

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useLocale } from 'next-intl'

export type SupportedCurrency = 'JPY' | 'KRW' | 'USD' | 'CNY' | 'EUR' | 'GBP'

interface CurrencyPreferenceContextValue {
  baseCurrency: SupportedCurrency
  mirrorCurrency: SupportedCurrency
  setBaseCurrency: (currency: SupportedCurrency) => void
  setMirrorCurrency: (currency: SupportedCurrency) => void
  mounted: boolean
}

const BASE_STORAGE_KEY = 'kablus-base-currency'
const MIRROR_STORAGE_KEY = 'kablus-mirror-currency'
const FALLBACK_BASE_CURRENCY: SupportedCurrency = 'JPY'

const CurrencyPreferenceContext = createContext<CurrencyPreferenceContextValue | undefined>(undefined)

const isSupportedCurrency = (value: string | null): value is SupportedCurrency => {
  return value === 'JPY' || value === 'KRW' || value === 'USD' || value === 'CNY' || value === 'EUR' || value === 'GBP'
}

const getLocaleMirrorCurrency = (locale: string): SupportedCurrency => {
  if (locale === 'ko') return 'KRW'
  if (locale === 'ja') return 'JPY'
  if (locale === 'zh') return 'CNY'
  if (locale === 'en') return 'USD'
  return 'KRW'
}

export function CurrencyPreferenceProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale()
  const [baseCurrency, setBaseCurrencyState] = useState<SupportedCurrency>(FALLBACK_BASE_CURRENCY)
  const [mirrorCurrency, setMirrorCurrencyState] = useState<SupportedCurrency>(getLocaleMirrorCurrency(locale))
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedBase = window.localStorage.getItem(BASE_STORAGE_KEY)
    const savedMirror = window.localStorage.getItem(MIRROR_STORAGE_KEY)

    setBaseCurrencyState(isSupportedCurrency(savedBase) ? savedBase : FALLBACK_BASE_CURRENCY)
    setMirrorCurrencyState(isSupportedCurrency(savedMirror) ? savedMirror : getLocaleMirrorCurrency(locale))
    setMounted(true)
  }, [locale])

  useEffect(() => {
    if (!mounted) return

    window.localStorage.setItem(BASE_STORAGE_KEY, baseCurrency)
    window.localStorage.setItem(MIRROR_STORAGE_KEY, mirrorCurrency)
  }, [baseCurrency, mirrorCurrency, mounted])

  const value = useMemo(
    () => ({
      baseCurrency,
      mirrorCurrency,
      setBaseCurrency: setBaseCurrencyState,
      setMirrorCurrency: setMirrorCurrencyState,
      mounted,
    }),
    [baseCurrency, mirrorCurrency, mounted],
  )

  return <CurrencyPreferenceContext.Provider value={value}>{children}</CurrencyPreferenceContext.Provider>
}

export function useCurrencyPreferences() {
  const context = useContext(CurrencyPreferenceContext)

  if (!context) {
    throw new Error('useCurrencyPreferences must be used within CurrencyPreferenceProvider')
  }

  return context
}
