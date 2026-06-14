import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveTransactionBaseSnapshot } from '@/lib/transactionBaseSnapshot'
import { getTodayDateStringInTimeZone } from '@/lib/timezone'

describe('transaction base snapshots', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses reverse current rates when only the opposite pair exists', async () => {
    const today = getTodayDateStringInTimeZone('Asia/Tokyo')

    const snapshot = await resolveTransactionBaseSnapshot({
      date: today,
      amount: -500000,
      currency: 'KRW',
      userTimeZone: 'Asia/Tokyo',
      currentRates: [
        { fromCurrency: 'JPY', toCurrency: 'KRW', rate: 9.337 },
      ],
      baseCurrency: 'JPY',
    })

    expect(snapshot.baseCurrencySnapshot).toBe('JPY')
    expect(snapshot.baseAmountSnapshot).toBeCloseTo(-53550.39198886152)
    expect(snapshot.snapshotRateApplied).toBeCloseTo(1 / 9.337)
    expect(snapshot.snapshotRateSource).toBe('current_rate')
  })

  it('uses historical rates for past-dated entries when available', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2025-06-01',
          rates: {
            JPY: 0.11,
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    )

    const snapshot = await resolveTransactionBaseSnapshot({
      date: '2025-06-01',
      amount: -58400,
      currency: 'KRW',
      userTimeZone: 'Asia/Tokyo',
      currentRates: [],
      baseCurrency: 'JPY',
    })

    expect(snapshot.baseAmountSnapshot).toBe(-6424)
    expect(snapshot.snapshotRateApplied).toBe(0.11)
    expect(snapshot.snapshotRateSource).toBe('frankfurter_historical')
  })

  it('falls back to the current stored rate when historical lookup fails', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response('not found', { status: 404 }),
    )

    const snapshot = await resolveTransactionBaseSnapshot({
      date: '2025-06-01',
      amount: -100,
      currency: 'USD',
      userTimeZone: 'Asia/Tokyo',
      currentRates: [
        { fromCurrency: 'USD', toCurrency: 'JPY', rate: 150 },
      ],
      baseCurrency: 'JPY',
    })

    expect(snapshot.baseAmountSnapshot).toBe(-15000)
    expect(snapshot.snapshotRateApplied).toBe(150)
    expect(snapshot.snapshotRateSource).toBe('fallback_current_rate')
  })
})
