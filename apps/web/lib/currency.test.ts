import { describe, expect, it, vi } from 'vitest'
import { convertCurrency, convertToBaseCurrency } from '@/lib/currency'

describe('currency conversion helpers', () => {
  it('uses a direct exchange rate when one exists', () => {
    const result = convertCurrency(100, 'USD', 'JPY', [
      { fromCurrency: 'USD', toCurrency: 'JPY', rate: 150 },
    ])

    expect(result).toBe(15000)
  })

  it('uses an inverse exchange rate when only the reverse pair exists', () => {
    const result = convertCurrency(500000, 'KRW', 'JPY', [
      { fromCurrency: 'JPY', toCurrency: 'KRW', rate: 9.337 },
    ])

    expect(result).toBeCloseTo(53550.39198886152)
  })

  it('sums multi-currency balances into the chosen base currency', () => {
    const result = convertToBaseCurrency(
      {
        JPY: 10000,
        KRW: 500000,
        USD: 100,
      },
      'JPY',
      [
        { fromCurrency: 'JPY', toCurrency: 'KRW', rate: 9.337 },
        { fromCurrency: 'USD', toCurrency: 'JPY', rate: 150 },
      ],
    )

    expect(result).toBeCloseTo(78550.39198886152)
  })

  it('falls back without crashing when no exchange rate exists', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = convertCurrency(100, 'EUR', 'JPY', [])

    expect(result).toBe(100)
    expect(warn).toHaveBeenCalled()
  })
})
