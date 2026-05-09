import { getTodayDateStringInTimeZone } from '@/lib/timezone'

interface CurrentRate {
  fromCurrency: string
  toCurrency: string
  rate: number
}

interface ResolveSnapshotParams {
  date: string
  amount: number
  currency: string
  exchangeToAmount?: number | null
  exchangeToCurrency?: string | null
  userTimeZone: string
  currentRates: CurrentRate[]
  baseCurrency?: string
  historicalCache?: Map<string, HistoricalRateResult | null>
}

interface HistoricalRateResult {
  rate: number
  date: string
  source: string
}

export interface TransactionBaseSnapshot {
  baseCurrencySnapshot: string
  baseAmountSnapshot: number | null
  exchangeToBaseAmountSnapshot: number | null
  snapshotRateApplied: number | null
  snapshotRateDate: Date | null
  snapshotRateSource: string | null
}

function normalizeDateInput(date: string) {
  return date.includes('T') ? date.split('T')[0] ?? date : date
}

function getRateFromCurrentTable(rates: CurrentRate[], fromCurrency: string, toCurrency: string) {
  if (fromCurrency === toCurrency) {
    return 1
  }

  const direct = rates.find((item) => item.fromCurrency === fromCurrency && item.toCurrency === toCurrency)?.rate
  if (typeof direct === 'number' && Number.isFinite(direct) && direct > 0) {
    return direct
  }

  const reverse = rates.find((item) => item.fromCurrency === toCurrency && item.toCurrency === fromCurrency)?.rate
  if (typeof reverse === 'number' && Number.isFinite(reverse) && reverse > 0) {
    return 1 / reverse
  }

  return null
}

async function fetchHistoricalRate(
  fromCurrency: string,
  toCurrency: string,
  date: string,
  cache?: Map<string, HistoricalRateResult | null>
) {
  const normalizedDate = normalizeDateInput(date)
  const cacheKey = `${fromCurrency}:${toCurrency}:${normalizedDate}`

  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey) ?? null
  }

  try {
    const response = await fetch(
      `https://api.frankfurter.dev/v1/${normalizedDate}?base=${encodeURIComponent(fromCurrency)}&symbols=${encodeURIComponent(toCurrency)}`,
      {
        headers: {
          Accept: 'application/json',
        },
        next: { revalidate: 60 * 60 * 24 },
      }
    )

    if (!response.ok) {
      cache?.set(cacheKey, null)
      return null
    }

    const data = await response.json() as {
      date?: string
      rates?: Record<string, number>
    }

    const rate = data?.rates?.[toCurrency]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      cache?.set(cacheKey, null)
      return null
    }

    const result = {
      rate,
      date: data.date || normalizedDate,
      source: 'frankfurter_historical',
    } satisfies HistoricalRateResult

    cache?.set(cacheKey, result)
    return result
  } catch {
    cache?.set(cacheKey, null)
    return null
  }
}

async function resolveFxRate(
  date: string,
  fromCurrency: string,
  toCurrency: string,
  userTimeZone: string,
  currentRates: CurrentRate[],
  historicalCache?: Map<string, HistoricalRateResult | null>
) {
  if (fromCurrency === toCurrency) {
    return {
      rate: 1,
      date: normalizeDateInput(date),
      source: 'identity',
    }
  }

  const normalizedDate = normalizeDateInput(date)
  const today = getTodayDateStringInTimeZone(userTimeZone)
  const isPastDatedEntry = normalizedDate < today

  if (isPastDatedEntry) {
    const historical = await fetchHistoricalRate(fromCurrency, toCurrency, normalizedDate, historicalCache)
    if (historical) {
      return historical
    }
  }

  const currentRate = getRateFromCurrentTable(currentRates, fromCurrency, toCurrency)
  if (typeof currentRate === 'number' && Number.isFinite(currentRate) && currentRate > 0) {
    return {
      rate: currentRate,
      date: normalizedDate,
      source: isPastDatedEntry ? 'fallback_current_rate' : 'current_rate',
    }
  }

  return null
}

export async function resolveTransactionBaseSnapshot({
  date,
  amount,
  currency,
  exchangeToAmount,
  exchangeToCurrency,
  userTimeZone,
  currentRates,
  baseCurrency = 'JPY',
  historicalCache,
}: ResolveSnapshotParams): Promise<TransactionBaseSnapshot> {
  const normalizedDate = normalizeDateInput(date)
  const rateResolution = await resolveFxRate(
    normalizedDate,
    currency,
    baseCurrency,
    userTimeZone,
    currentRates,
    historicalCache
  )

  const exchangeResolution =
    exchangeToAmount && exchangeToCurrency
      ? await resolveFxRate(
          normalizedDate,
          exchangeToCurrency,
          baseCurrency,
          userTimeZone,
          currentRates,
          historicalCache
        )
      : null

  return {
    baseCurrencySnapshot: baseCurrency,
    baseAmountSnapshot: rateResolution ? amount * rateResolution.rate : null,
    exchangeToBaseAmountSnapshot:
      exchangeResolution && exchangeToAmount
        ? exchangeToAmount * exchangeResolution.rate
        : null,
    snapshotRateApplied: rateResolution?.rate ?? null,
    snapshotRateDate: rateResolution?.date ? new Date(`${rateResolution.date}T00:00:00.000Z`) : null,
    snapshotRateSource: rateResolution?.source ?? null,
  }
}
