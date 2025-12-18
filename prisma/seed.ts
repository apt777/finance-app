import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // ============================================================================
  // 1. Seed Currencies
  // ============================================================================
  console.log('📍 Seeding currencies...')
  const currencies = [
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'KRW', name: 'Korean Won', symbol: '₩' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ]

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    })
  }
  console.log(`✅ Seeded ${currencies.length} currencies`)

  // ============================================================================
  // 2. Seed Account Types
  // ============================================================================
  console.log('📍 Seeding account types...')
  const accountTypes = [
    { name: 'Checking Account', key: 'checking' },
    { name: 'Savings Account', key: 'savings' },
    { name: 'Credit Card', key: 'credit_card' },
    { name: 'Investment Account', key: 'investment' },
    { name: 'NISA Account', key: 'nisa' },
    { name: 'Crypto Wallet', key: 'crypto' },
    { name: 'Cash', key: 'cash' },
  ]

  for (const accountType of accountTypes) {
    await prisma.accountType.upsert({
      where: { key: accountType.key },
      update: {},
      create: accountType,
    })
  }
  console.log(`✅ Seeded ${accountTypes.length} account types`)

  // ============================================================================
  // 3. Seed Transaction Categories
  // ============================================================================
  console.log('📍 Seeding transaction categories...')
  const categories = [
    // Income categories
    { name: 'Salary', key: 'salary', icon: '💼' },
    { name: 'Bonus', key: 'bonus', icon: '🎁' },
    { name: 'Investment Income', key: 'investment_income', icon: '📈' },
    { name: 'Other Income', key: 'other_income', icon: '💰' },

    // Expense categories
    { name: 'Food & Dining', key: 'food_dining', icon: '🍽️' },
    { name: 'Groceries', key: 'groceries', icon: '🛒' },
    { name: 'Transportation', key: 'transportation', icon: '🚗' },
    { name: 'Utilities', key: 'utilities', icon: '💡' },
    { name: 'Entertainment', key: 'entertainment', icon: '🎬' },
    { name: 'Shopping', key: 'shopping', icon: '🛍️' },
    { name: 'Healthcare', key: 'healthcare', icon: '🏥' },
    { name: 'Education', key: 'education', icon: '📚' },
    { name: 'Travel', key: 'travel', icon: '✈️' },
    { name: 'Accommodation', key: 'accommodation', icon: '🏨' },
    { name: 'Subscription', key: 'subscription', icon: '📱' },
    { name: 'Insurance', key: 'insurance', icon: '🛡️' },
    { name: 'Rent', key: 'rent', icon: '🏠' },
    { name: 'Loan Payment', key: 'loan_payment', icon: '💳' },
    { name: 'Tax', key: 'tax', icon: '📋' },
    { name: 'Other Expense', key: 'other_expense', icon: '💸' },
  ]

  for (const category of categories) {
    await prisma.transactionCategory.upsert({
      where: { key: category.key },
      update: {},
      create: category,
    })
  }
  console.log(`✅ Seeded ${categories.length} transaction categories`)

  console.log('✨ Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
