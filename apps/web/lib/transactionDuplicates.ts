export type DuplicateComparableTransaction = {
  id?: string
  accountId?: string | null
  fromAccountId?: string | null
  toAccountId?: string | null
  date: string | Date
  description: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency?: string | null
}

export type DuplicateCheckInput = {
  accountId?: string | null
  fromAccountId?: string | null
  toAccountId?: string | null
  date: string
  description: string
  type: 'income' | 'expense' | 'transfer'
  amount: number
  currency?: string | null
}

function normalizeDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toISOString().slice(0, 10)
}

function normalizeDescription(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function normalizeAmount(type: DuplicateComparableTransaction['type'], amount: number) {
  if (!Number.isFinite(amount)) {
    return Number.NaN
  }

  if (type === 'transfer') {
    return Math.abs(amount)
  }

  return Math.abs(amount)
}

function hasSameAccountScope(a: DuplicateCheckInput, b: DuplicateComparableTransaction) {
  if (a.type === 'transfer' || b.type === 'transfer') {
    return (a.fromAccountId || null) === (b.fromAccountId || null)
      && (a.toAccountId || null) === (b.toAccountId || null)
  }

  return (a.accountId || null) === (b.accountId || null)
}

export function isDuplicateTransactionCandidate(
  input: DuplicateCheckInput,
  existing: DuplicateComparableTransaction
) {
  if (input.type !== existing.type) {
    return false
  }

  if (!hasSameAccountScope(input, existing)) {
    return false
  }

  if (normalizeDate(input.date) !== normalizeDate(existing.date)) {
    return false
  }

  if (normalizeDescription(input.description) !== normalizeDescription(existing.description)) {
    return false
  }

  return normalizeAmount(input.type, input.amount) === normalizeAmount(existing.type, existing.amount)
}

export function findDuplicateTransaction<T extends DuplicateComparableTransaction>(
  input: DuplicateCheckInput,
  existing: T[]
) {
  return existing.find((transaction) => isDuplicateTransactionCandidate(input, transaction)) ?? null
}
