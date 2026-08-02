import { describe, expect, it } from 'vitest'
import { calculateNextAccountBalance, calculateTransferAccountBalance } from '@/lib/accountBalance'

describe('account balance helpers', () => {
  it('applies expense and income to normal accounts', () => {
    expect(calculateNextAccountBalance(10000, 'checking', 'expense', 1200)).toBe(8800)
    expect(calculateNextAccountBalance(10000, 'checking', 'income', 1200)).toBe(11200)
  })

  it('applies expense and income to credit card liabilities inversely', () => {
    expect(calculateNextAccountBalance(30000, 'credit_card', 'expense', 1200)).toBe(31200)
    expect(calculateNextAccountBalance(30000, 'credit_card', 'income', 1200)).toBe(28800)
  })

  it('applies transfer deltas correctly for both source and destination accounts', () => {
    expect(calculateTransferAccountBalance(10000, 'checking', 'from', 2500)).toBe(7500)
    expect(calculateTransferAccountBalance(10000, 'checking', 'to', 2500)).toBe(12500)
    expect(calculateTransferAccountBalance(30000, 'credit_card', 'from', 2500)).toBe(32500)
    expect(calculateTransferAccountBalance(30000, 'credit_card', 'to', 2500)).toBe(27500)
  })
})
