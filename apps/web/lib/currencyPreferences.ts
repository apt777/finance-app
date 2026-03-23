export type SupportedCurrency = 'JPY' | 'KRW' | 'USD' | 'CNY' | 'EUR' | 'GBP'

export function getLocaleBaseCurrency(locale: string): SupportedCurrency {
  if (locale === 'ko') return 'KRW'
  if (locale === 'ja') return 'JPY'
  if (locale === 'zh') return 'CNY'
  if (locale === 'en') return 'USD'
  return 'JPY'
}

export function getLocaleMirrorCurrency(locale: string): SupportedCurrency {
  if (locale === 'ko') return 'JPY'
  if (locale === 'ja') return 'USD'
  if (locale === 'zh') return 'USD'
  if (locale === 'en') return 'JPY'
  return 'KRW'
}

export function getLocaleTrackedCurrencies(locale: string): SupportedCurrency[] {
  if (locale === 'ko') return ['KRW', 'JPY', 'USD']
  if (locale === 'ja') return ['JPY', 'USD', 'KRW']
  if (locale === 'zh') return ['CNY', 'USD', 'JPY']
  if (locale === 'en') return ['USD', 'JPY', 'EUR']
  return ['JPY', 'USD', 'KRW']
}
