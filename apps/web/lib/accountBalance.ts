type SupportedTransactionType = 'income' | 'expense'
type SupportedAccountType = string

export function calculateNextAccountBalance(
  currentBalance: number,
  accountType: SupportedAccountType,
  transactionType: SupportedTransactionType,
  amount: number,
) {
  if (accountType === 'credit_card') {
    return transactionType === 'income'
      ? currentBalance - amount
      : currentBalance + amount
  }

  return transactionType === 'income'
    ? currentBalance + amount
    : currentBalance - amount
}

export function calculateTransferAccountBalance(
  currentBalance: number,
  accountType: SupportedAccountType,
  direction: 'from' | 'to',
  amount: number,
) {
  if (direction === 'from') {
    return accountType === 'credit_card'
      ? currentBalance + amount
      : currentBalance - amount
  }

  return accountType === 'credit_card'
    ? currentBalance - amount
    : currentBalance + amount
}
