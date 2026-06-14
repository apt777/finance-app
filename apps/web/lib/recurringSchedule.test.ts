import { describe, expect, it } from 'vitest'
import { calculateInitialRunDate, calculateNextRunDate } from '@/lib/recurringSchedule'

function formatLocalDate(value: Date) {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
}

describe('recurring schedule helpers', () => {
  it('moves a weekly recurring transaction to the next matching weekday', () => {
    const baseDate = new Date('2026-06-17T12:00:00.000Z') // Wednesday

    const result = calculateNextRunDate(baseDate, 'weekly', null, 1)

    expect(formatLocalDate(result)).toBe('2026-06-22')
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
  })

  it('clamps monthly runs to the last day of shorter months', () => {
    const baseDate = new Date('2026-01-31T12:00:00.000Z')

    const result = calculateNextRunDate(baseDate, 'monthly', 31)

    expect(formatLocalDate(result)).toBe('2026-02-28')
    expect(result.getHours()).toBe(0)
  })

  it('keeps the first monthly run in the same month when the target day has not passed', () => {
    const startDate = new Date('2026-06-14T09:00:00.000Z')

    const result = calculateInitialRunDate(startDate, 'monthly', 20)

    expect(formatLocalDate(result)).toBe('2026-06-20')
    expect(result.getHours()).toBe(0)
  })

  it('pushes the first monthly run to the next month when the target day already passed', () => {
    const startDate = new Date('2026-06-21T09:00:00.000Z')

    const result = calculateInitialRunDate(startDate, 'monthly', 20)

    expect(formatLocalDate(result)).toBe('2026-07-20')
    expect(result.getHours()).toBe(0)
  })
})
