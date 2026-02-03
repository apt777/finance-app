/**
 * 복수 통화 관리 유틸리티
 * JPY (일본 엔화), KRW (한국 원화), USD (미국 달러) 지원
 */

export type Currency = 'JPY' | 'KRW' | 'USD' | 'CNY' | 'EUR' | 'GBP'

export interface ExchangeRate {
  id?: string
  userId?: string
  fromCurrency: string
  toCurrency: string
  rate: number
  source?: string
  createdAt?: string
  updatedAt?: string
}

// Legacy interface for backward compatibility
export interface LegacyExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdated?: Date
}

export interface CurrencySymbol {
  [key: string]: string
}

export interface CurrencyName {
  [key: string]: string
}

// 통화 심볼
export const CURRENCY_SYMBOLS: CurrencySymbol = {
  JPY: '¥',
  KRW: '₩',
  USD: '$',
  CNY: '¥',
  EUR: '€',
  GBP: '£',
}

// 통화 이름
export const CURRENCY_NAMES: CurrencyName = {
  JPY: '일본 엔',
  KRW: '한국 원',
  USD: '미국 달러',
  CNY: '중국 위안',
  EUR: '유로',
  GBP: '영국 파운드',
}

// 기본 환율 (수동 설정용)
export const DEFAULT_EXCHANGE_RATES: ExchangeRate[] = [
  { fromCurrency: 'JPY', toCurrency: 'KRW', rate: 10.5 },
  { fromCurrency: 'JPY', toCurrency: 'USD', rate: 0.0067 },
  { fromCurrency: 'KRW', toCurrency: 'JPY', rate: 0.095 },
  { fromCurrency: 'KRW', toCurrency: 'USD', rate: 0.00077 },
  { fromCurrency: 'USD', toCurrency: 'JPY', rate: 149.25 },
  { fromCurrency: 'USD', toCurrency: 'KRW', rate: 1298.5 },
]

/**
 * 환율을 이용한 통화 변환
 * @param amount 변환할 금액
 * @param from 원래 통화
 * @param to 변환할 통화
 * @param exchangeRates 환율 정보
 * @returns 변환된 금액
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  exchangeRates: ExchangeRate[]
): number {
  if (from === to) {
    return amount
  }

  const rate = exchangeRates.find(
    (r) => r.fromCurrency === from && r.toCurrency === to
  )

  if (!rate) {
    // Try inverse rate
    const inverseRate = exchangeRates.find(
      (r) => r.fromCurrency === to && r.toCurrency === from
    )
    if (inverseRate && inverseRate.rate !== 0) {
        return amount / inverseRate.rate
    }

    console.warn(
      `환율을 찾을 수 없습니다: ${from} -> ${to}`
    )
    return amount
  }

  return amount * rate.rate
}

/**
 * 여러 통화의 금액을 기본 통화로 변환
 * @param amounts 통화별 금액 맵
 * @param baseCurrency 기본 통화
 * @param exchangeRates 환율 정보
 * @returns 기본 통화로 변환된 총액
 */
export function convertToBaseCurrency(
  amounts: { [key: string]: number | undefined },
  baseCurrency: string,
  exchangeRates: ExchangeRate[]
): number {
  let total = 0

  for (const [currency, amount] of Object.entries(amounts)) {
    if (amount !== undefined && currency !== baseCurrency) {
      total += convertCurrency(
        amount,
        currency,
        baseCurrency,
        exchangeRates
      )
    } else if (amount !== undefined && currency === baseCurrency) {
      total += amount
    }
  }

  return total
}

/**
 * 환율 업데이트 (수동 설정)
 * @param exchangeRates 기존 환율 정보
 * @param from 출발 통화
 * @param to 도착 통화
 * @param newRate 새로운 환율
 * @returns 업데이트된 환율 정보
 */
export function updateExchangeRate(
  exchangeRates: ExchangeRate[],
  from: string,
  to: string,
  newRate: number
): ExchangeRate[] {
  const updatedRates = [...exchangeRates]
  const index = updatedRates.findIndex((r) => r.fromCurrency === from && r.toCurrency === to)

  if (index !== -1) {
    const existing = updatedRates[index]
    if (existing) {
      updatedRates[index] = {
        ...existing,
        rate: newRate,
      }
    }
  } else {
    updatedRates.push({
      fromCurrency: from,
      toCurrency: to,
      rate: newRate,
    })
  }

  return updatedRates
}

/**
 * 역방향 환율 계산
 * @param rate 원래 환율
 * @returns 역방향 환율
 */
export function getReverseRate(rate: number): number {
  return 1 / rate
}

/**
 * 통화 포맷팅
 * @param amount 금액
 * @param currency 통화
 * @param locale 로케일 (기본값: 'ko-KR')
 * @returns 포맷된 통화 문자열
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: string = 'ko-KR'
): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return formatter.format(amount)
}

/**
 * 통화 심볼 가져오기
 * @param currency 통화
 * @returns 통화 심볼
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || currency
}

/**
 * 통화 이름 가져오기
 * @param currency 통화
 * @returns 통화 이름
 */
export function getCurrencyName(currency: string): string {
  return CURRENCY_NAMES[currency] || currency
}

/**
 * 모든 지원 통화 목록
 */
export const SUPPORTED_CURRENCIES: string[] = ['JPY', 'KRW', 'USD', 'CNY', 'EUR', 'GBP']

/**
 * 통화가 지원되는지 확인
 * @param currency 통화
 * @returns 지원 여부
 */
export function isSupportedCurrency(currency: string): boolean {
  return SUPPORTED_CURRENCIES.includes(currency)
}
