import { describe, expect, it } from 'vitest'
import {
  NO_BALANCE_SYNC_MARKER,
  normalizeDateInput,
  serializeNotes,
  shouldApplyBalanceAdjustment,
  stripInternalNotes,
  transactionAffectsBalance,
} from '@/lib/transactionPersistence'

describe('transactionPersistence', () => {
  it('normalizes ISO-style date strings to yyyy-mm-dd', () => {
    expect(normalizeDateInput('2026-08-02T09:15:00.000Z')).toBe('2026-08-02')
    expect(normalizeDateInput('2026-08-02')).toBe('2026-08-02')
  })

  it('always applies balance adjustment for today', () => {
    expect(shouldApplyBalanceAdjustment('2026-08-02', 'Asia/Tokyo', false)).toBe(true)
  })

  it('uses explicit opt-in for past transactions', () => {
    expect(shouldApplyBalanceAdjustment('2026-08-01', 'Asia/Tokyo', false)).toBe(false)
    expect(shouldApplyBalanceAdjustment('2026-08-01', 'Asia/Tokyo', true)).toBe(true)
  })

  it('marks notes when balance sync is disabled', () => {
    expect(serializeNotes('memo', false)).toBe(`memo\n${NO_BALANCE_SYNC_MARKER}`)
    expect(serializeNotes('', false)).toBe(NO_BALANCE_SYNC_MARKER)
  })

  it('strips internal markers from notes for display', () => {
    expect(stripInternalNotes(`memo\n${NO_BALANCE_SYNC_MARKER}`)).toBe('memo')
    expect(stripInternalNotes(NO_BALANCE_SYNC_MARKER)).toBe(null)
  })

  it('detects whether a transaction should affect balances', () => {
    expect(transactionAffectsBalance({ notes: null })).toBe(true)
    expect(transactionAffectsBalance({ notes: `memo\n${NO_BALANCE_SYNC_MARKER}` })).toBe(false)
  })
})
