const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

export interface AlphaVantageSymbolMatch {
  symbol: string
  name: string
  region: string
  currency: string
  type: string
  matchScore: number
}

function getApiKey() {
  return process.env.ALPHA_VANTAGE_API_KEY
}

async function fetchAlphaVantage(params: Record<string, string>) {
  const apiKey = getApiKey()

  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not configured')
  }

  const searchParams = new URLSearchParams({
    ...params,
    apikey: apiKey,
  })

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${searchParams.toString()}`, {
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Alpha Vantage data')
  }

  return response.json()
}

export async function searchSymbols(keywords: string) {
  const trimmed = keywords.trim()

  if (!trimmed) {
    return []
  }

  const data = await fetchAlphaVantage({
    function: 'SYMBOL_SEARCH',
    keywords: trimmed,
  })

  const matches = Array.isArray(data?.bestMatches) ? data.bestMatches : []

  return matches
    .map((match: Record<string, string>) => ({
      symbol: match['1. symbol']?.trim() || '',
      name: match['2. name']?.trim() || '',
      type: match['3. type']?.trim() || '',
      region: match['4. region']?.trim() || '',
      currency: match['8. currency']?.trim() || '',
      matchScore: Number(match['9. matchScore'] || 0),
    }))
    .filter((match: AlphaVantageSymbolMatch) => Boolean(match.symbol && match.name))
    .sort((a: AlphaVantageSymbolMatch, b: AlphaVantageSymbolMatch) => b.matchScore - a.matchScore)
}

export async function fetchQuote(symbol: string) {
  const data = await fetchAlphaVantage({
    function: 'GLOBAL_QUOTE',
    symbol,
  })

  const quote = data?.['Global Quote']

  if (!quote || typeof quote !== 'object') {
    return null
  }

  const price = Number(quote['05. price'] || 0)

  if (!Number.isFinite(price) || price <= 0) {
    return null
  }

  return {
    symbol: quote['01. symbol']?.trim() || symbol,
    price,
    previousClose: Number(quote['08. previous close'] || 0),
    latestTradingDay: quote['07. latest trading day']?.trim() || null,
  }
}

export function getHoldingQuoteUpdateIntervalMs(symbolCount: number) {
  const reservedDailyCallsForSearch = 5
  const availableDailyCallsForQuotes = Math.max(1, 25 - reservedDailyCallsForSearch)
  const normalizedSymbolCount = Math.max(1, symbolCount)
  const intervalHours = Math.min(24, Math.max(6, Math.ceil((normalizedSymbolCount * 24) / availableDailyCallsForQuotes)))

  return intervalHours * 60 * 60 * 1000
}
