const { PrismaClient } = require('@prisma/client');
const {
  dummyUsers,
  dummyAccounts,
  dummyTransactions,
  dummyHoldings,
  dummyExchangeRates,
  dummyGoals,
} = require('./dummyData');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  for (const userData of dummyUsers) {
    await prisma.user.upsert({ where: { id: userData.id }, update: {}, create: userData });
    console.log(`Upserted user with id: ${userData.id}`);
  }

  for (const accountData of dummyAccounts) {
    await prisma.account.upsert({ where: { id: accountData.id }, update: {}, create: accountData });
    console.log(`Upserted account with id: ${accountData.id}`);
  }

  for (const transactionData of dummyTransactions) {
    await prisma.transaction.upsert({ where: { id: transactionData.id }, update: {}, create: transactionData });
    console.log(`Upserted transaction with id: ${transactionData.id}`);
  }

  for (const holdingData of dummyHoldings) {
    await prisma.holding.upsert({ where: { id: holdingData.id }, update: {}, create: holdingData });
    console.log(`Upserted holding with id: ${holdingData.id}`);
  }

  for (const goalData of dummyGoals) {
    await prisma.goal.upsert({ where: { id: goalData.id }, update: {}, create: goalData });
    console.log(`Upserted goal with id: ${goalData.id}`);
  }

  for (const rateData of dummyExchangeRates) {
    await prisma.exchangeRate.upsert({
      where: { from_to: { from: rateData.from, to: rateData.to } },
      update: { rate: rateData.rate },
      create: rateData,
    });
    console.log(`Upserted exchange rate from ${rateData.from} to ${rateData.to}`);
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
