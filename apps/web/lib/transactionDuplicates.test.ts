import { describe, expect, it } from 'vitest'
import { findDuplicateTransaction, isDuplicateTransactionCandidate } from '@/lib/transactionDuplicates'

describe('transaction duplicate detection', () => {
  it('matches identical expense transactions', () => {
    const input = {
      accountId: 'account-1',
      date: '2026-06-14',
      description: 'Starbucks coffee',
      type: 'expense' as const,
      amount: 500,
      currency: 'JPY',
    }

    const existing = {
      id: 'tx-1',
      accountId: 'account-1',
      date: new Date('2026-06-14T09:00:00.000Z'),
      description: '  starbucks   coffee ',
      type: 'expense',
      amount: -500,
      currency: 'JPY',
    }

    expect(isDuplicateTransactionCandidate(input, existing)).toBe(true)
  })

  it('does not treat transactions with different descriptions as duplicates by default', () => {
    const duplicate = findDuplicateTransaction(
      {
        accountId: 'account-1',
        date: '2026-06-14',
        description: 'Lunch',
        type: 'expense',
        amount: 1200,
        currency: 'JPY',
      },
      [
        {
          accountId: 'account-1',
          date: '2026-06-14',
          description: 'Dinner',
          type: 'expense',
          amount: -1200,
          currency: 'JPY',
        },
      ],
    )

    expect(duplicate).toBeNull()
  })

  it('can ignore descriptions when a looser duplicate check is requested', () => {
    const duplicate = findDuplicateTransaction(
      {
        accountId: 'account-1',
        date: '2026-06-14',
        description: 'Lunch',
        type: 'expense',
        amount: 1200,
        currency: 'JPY',
        ignoreDescription: true,
      },
      [
        {
          accountId: 'account-1',
          date: '2026-06-14',
          description: 'Dinner',
          type: 'expense',
          amount: -1200,
          currency: 'JPY',
        },
      ],
    )

    expect(duplicate).not.toBeNull()
  })

  it('checks transfer scope using both from and to accounts', () => {
    const duplicate = findDuplicateTransaction(
      {
        fromAccountId: 'bank-1',
        toAccountId: 'card-1',
        date: '2026-06-14',
        description: 'Card payment',
        type: 'transfer',
        amount: 10000,
        currency: 'JPY',
      },
      [
        {
          fromAccountId: 'bank-2',
          toAccountId: 'card-1',
          date: '2026-06-14',
          description: 'Card payment',
          type: 'transfer',
          amount: 10000,
          currency: 'JPY',
        },
      ],
    )

    expect(duplicate).toBeNull()
  })
})
