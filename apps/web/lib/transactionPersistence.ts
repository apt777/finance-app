import { getTodayDateStringInTimeZone } from '@/lib/timezone'

export const NO_BALANCE_SYNC_MARKER = '[[KABLUS_NO_BALANCE_SYNC]]'
export const RECURRING_AUTO_MARKER = '[[KABLUS_RECURRING_AUTO]]'

export function normalizeDateInput(date: string) {
  return date.includes('T') ? date.split('T')[0] ?? date : date
}

export function isTodayTransaction(date: string, timeZone: string) {
  return normalizeDateInput(date) === getTodayDateStringInTimeZone(timeZone)
}

export function shouldApplyBalanceAdjustment(date: string, timeZone: string, requested?: boolean) {
  if (isTodayTransaction(date, timeZone)) {
    return true
  }

  return Boolean(requested)
}

export function serializeNotes(notes: string | undefined, applyBalanceAdjustment: boolean) {
  const cleaned = (notes || '').replace(NO_BALANCE_SYNC_MARKER, '').trim()

  if (applyBalanceAdjustment) {
    return cleaned || null
  }

  return cleaned ? `${cleaned}\n${NO_BALANCE_SYNC_MARKER}` : NO_BALANCE_SYNC_MARKER
}

export function stripInternalNotes(notes?: string | null) {
  if (!notes) return null

  const cleaned = notes
    .replace(NO_BALANCE_SYNC_MARKER, '')
    .replace(RECURRING_AUTO_MARKER, '')
    .trim()

  return cleaned || null
}

export function transactionAffectsBalance(transaction: { notes?: string | null }) {
  return !transaction.notes?.includes(NO_BALANCE_SYNC_MARKER)
}
