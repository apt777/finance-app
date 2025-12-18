export const locales = ['ko', 'ja', 'en', 'zh'] as const
export const defaultLocale = 'ko' as const

export type Locale = (typeof locales)[number]
