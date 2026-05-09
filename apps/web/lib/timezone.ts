export const TIMEZONE_SETTING_KEY = 'preferred_timezone'
export const TIMEZONE_STORAGE_KEY = 'kablus-timezone'
export const DEFAULT_TIMEZONE = 'Asia/Tokyo'

type SupportedLocale = 'ko' | 'en' | 'ja' | 'zh'

type TimeZonePreset = {
  value: string
  labels: Record<SupportedLocale, string>
}

const TIME_ZONE_PRESETS: TimeZonePreset[] = [
  {
    value: 'Asia/Tokyo',
    labels: {
      ko: '일본 (도쿄)',
      en: 'Japan (Tokyo)',
      ja: '日本 (東京)',
      zh: '日本（东京）',
    },
  },
  {
    value: 'Asia/Seoul',
    labels: {
      ko: '대한민국 (서울)',
      en: 'South Korea (Seoul)',
      ja: '韓国 (ソウル)',
      zh: '韩国（首尔）',
    },
  },
  {
    value: 'Asia/Shanghai',
    labels: {
      ko: '중국 (상하이)',
      en: 'China (Shanghai)',
      ja: '中国 (上海)',
      zh: '中国（上海）',
    },
  },
  {
    value: 'Asia/Singapore',
    labels: {
      ko: '싱가포르',
      en: 'Singapore',
      ja: 'シンガポール',
      zh: '新加坡',
    },
  },
  {
    value: 'Europe/London',
    labels: {
      ko: '영국 (런던)',
      en: 'United Kingdom (London)',
      ja: 'イギリス (ロンドン)',
      zh: '英国（伦敦）',
    },
  },
  {
    value: 'Europe/Paris',
    labels: {
      ko: '프랑스 (파리)',
      en: 'France (Paris)',
      ja: 'フランス (パリ)',
      zh: '法国（巴黎）',
    },
  },
  {
    value: 'America/New_York',
    labels: {
      ko: '미국 동부 (뉴욕)',
      en: 'US East (New York)',
      ja: '米国東部 (ニューヨーク)',
      zh: '美国东部（纽约）',
    },
  },
  {
    value: 'America/Chicago',
    labels: {
      ko: '미국 중부 (시카고)',
      en: 'US Central (Chicago)',
      ja: '米国中部 (シカゴ)',
      zh: '美国中部（芝加哥）',
    },
  },
  {
    value: 'America/Los_Angeles',
    labels: {
      ko: '미국 서부 (로스앤젤레스)',
      en: 'US West (Los Angeles)',
      ja: '米国西部 (ロサンゼルス)',
      zh: '美国西部（洛杉矶）',
    },
  },
  {
    value: 'Australia/Sydney',
    labels: {
      ko: '호주 (시드니)',
      en: 'Australia (Sydney)',
      ja: 'オーストラリア (シドニー)',
      zh: '澳大利亚（悉尼）',
    },
  },
  {
    value: 'UTC',
    labels: {
      ko: 'UTC (협정 세계시)',
      en: 'UTC',
      ja: 'UTC',
      zh: 'UTC',
    },
  },
]

export function getLocaleDefaultTimeZone(locale?: string) {
  if (locale === 'ko') return 'Asia/Seoul'
  if (locale === 'ja') return 'Asia/Tokyo'
  if (locale === 'zh') return 'Asia/Shanghai'
  if (locale === 'en') return 'America/New_York'
  return DEFAULT_TIMEZONE
}

export function isValidTimeZone(timeZone?: string | null): timeZone is string {
  if (!timeZone || typeof timeZone !== 'string') {
    return false
  }

  try {
    Intl.DateTimeFormat('en-US', { timeZone }).format(new Date())
    return true
  } catch {
    return false
  }
}

export function normalizeTimeZone(timeZone?: string | null, fallback = DEFAULT_TIMEZONE) {
  return isValidTimeZone(timeZone) ? timeZone : fallback
}

export function getTimeZoneOptions(locale: string) {
  const normalizedLocale = (['ko', 'en', 'ja', 'zh'].includes(locale) ? locale : 'en') as SupportedLocale

  return TIME_ZONE_PRESETS.map((preset) => ({
    value: preset.value,
    label: preset.labels[normalizedLocale],
  }))
}

export function getDatePartsInTimeZone(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  const parts = formatter.formatToParts(date)
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0)
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0)
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0)

  return { year, month, day }
}

export function formatDateParts(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export function getTodayDateStringInTimeZone(timeZone: string, now = new Date()) {
  return formatDateParts(getDatePartsInTimeZone(now, normalizeTimeZone(timeZone)))
}

export function getMonthKeyInTimeZone(timeZone: string, now = new Date()) {
  const parts = getDatePartsInTimeZone(now, normalizeTimeZone(timeZone))
  return `${parts.year}-${String(parts.month).padStart(2, '0')}`
}

export function getCalendarDateString(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function getClientResolvedTimeZone(fallback = DEFAULT_TIMEZONE) {
  if (typeof window === 'undefined') {
    return fallback
  }

  const browserTimeZone = window.Intl?.DateTimeFormat?.().resolvedOptions().timeZone
  return normalizeTimeZone(browserTimeZone, fallback)
}

export function getClientPreferredTimeZone(locale?: string) {
  const fallback = getLocaleDefaultTimeZone(locale)

  if (typeof window === 'undefined') {
    return fallback
  }

  const stored = window.localStorage.getItem(TIMEZONE_STORAGE_KEY)
  if (isValidTimeZone(stored)) {
    return stored
  }

  return getClientResolvedTimeZone(fallback)
}

export function getClientTodayDateString(locale?: string) {
  return getTodayDateStringInTimeZone(getClientPreferredTimeZone(locale))
}

export function saveClientPreferredTimeZone(timeZone: string) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TIMEZONE_STORAGE_KEY, normalizeTimeZone(timeZone))
}
