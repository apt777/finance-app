import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

const locales = ['ko', 'ja', 'en', 'zh'] as const
const defaultLocale = 'ko' as const

export type Locale = (typeof locales)[number]

export function isValidLocale(locale: unknown): locale is Locale {
  return locales.includes(locale as Locale)
}

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!isValidLocale(locale)) {
    notFound()
  }

  return {
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
