// Using fixed IDs for easier referencing in related models

const dummyUsers = [
  {
    id: 'user-test-1',
    email: 'test@example.com',
    name: 'Test User',
  },
];

const dummyAccounts = [
  {
    id: 'acc-checking-krw',
    userId: 'user-test-1',
    name: 'Checking Account',
    type: 'checking',
    balance: 1500000,
    currency: 'KRW',
  },
  {
    id: 'acc-savings-jpy',
    userId: 'user-test-1',
    name: 'Savings Account',
    type: 'savings',
    balance: 500000,
    currency: 'JPY',
  },
  {
    id: 'acc-investment-usd',
    userId: 'user-test-1',
    name: 'Investment Account',
    type: 'investment',
    balance: 10000,
    currency: 'USD',
  },
];

const dummyTransactions = [
  {
    id: 'txn-1',
    accountId: 'acc-checking-krw',
    date: new Date('2024-07-01T10:00:00Z'),
    description: 'Salary',
    amount: 3000000,
    currency: 'KRW',
    type: 'income',
  },
  {
    id: 'txn-2',
    accountId: 'acc-checking-krw',
    date: new Date('2024-07-05T15:30:00Z'),
    description: 'Groceries',
    amount: -150000,
    currency: 'KRW',
    type: 'expense',
  },
  {
    id: 'txn-3',
    accountId: 'acc-savings-jpy',
    date: new Date('2024-07-10T09:00:00Z'),
    description: 'Transfer to Savings',
    amount: 100000,
    currency: 'JPY',
    type: 'transfer',
  },
];

const dummyHoldings = [
  {
    id: 'holding-1',
    accountId: 'acc-investment-usd',
    symbol: 'SPY',
    shares: 10,
    costBasis: 450,
    currency: 'USD',
  },
  {
    id: 'holding-2',
    accountId: 'acc-investment-usd',
    symbol: '069500.KS', // KODEX 200 ETF
    shares: 50,
    costBasis: 30000,
    currency: 'KRW',
  },
  {
    id: 'holding-3',
    accountId: 'acc-investment-usd',
    symbol: 'GLD',
    shares: 5,
    costBasis: 190,
    currency: 'USD',
  },
];

const dummyExchangeRates = [
  { from: 'KRW', to: 'USD', rate: 0.00075 },
  { from: 'JPY', to: 'USD', rate: 0.0068 },
  { from: 'USD', to: 'KRW', rate: 1333.33 },
  { from: 'USD', to: 'JPY', rate: 147.06 },
  { from: 'KRW', to: 'JPY', rate: 0.11 }, // Approximate rate: 1 KRW = 0.11 JPY
  { from: 'JPY', to: 'KRW', rate: 9.09 }, // Approximate rate: 1 JPY = 9.09 KRW
];

const dummyGoals = [
  {
    id: 'goal-1',
    userId: 'user-test-1',
    name: 'Emergency Fund',
    targetAmount: 10000000,
    currentAmount: 2000000,
    targetDate: new Date('2025-12-31T00:00:00Z'),
  },
];

module.exports = {
  dummyUsers,
  dummyAccounts,
  dummyTransactions,
  dummyHoldings,
  dummyExchangeRates,
  dummyGoals,
};
