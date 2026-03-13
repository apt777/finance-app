ALTER TABLE "TransactionCategory"
ADD COLUMN "userId" TEXT,
ADD COLUMN "color" TEXT,
ADD COLUMN "type" TEXT NOT NULL DEFAULT 'expense',
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "TransactionCategory_key_key";
CREATE UNIQUE INDEX "TransactionCategory_userId_key_key" ON "TransactionCategory"("userId", "key");
CREATE INDEX "TransactionCategory_userId_idx" ON "TransactionCategory"("userId");

CREATE INDEX IF NOT EXISTS "Transaction_categoryKey_idx" ON "Transaction"("categoryKey");

CREATE TABLE "Budget" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "categoryKey" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "period" TEXT NOT NULL DEFAULT 'monthly',
  "year" INTEGER NOT NULL,
  "month" INTEGER,
  "alertThreshold" INTEGER NOT NULL DEFAULT 80,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Budget_userId_idx" ON "Budget"("userId");
CREATE INDEX "Budget_categoryKey_idx" ON "Budget"("categoryKey");
CREATE UNIQUE INDEX "Budget_userId_categoryKey_period_year_month_key" ON "Budget"("userId", "categoryKey", "period", "year", "month");

CREATE TABLE "RecurringTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "categoryKey" TEXT,
  "accountId" TEXT,
  "fromAccountId" TEXT,
  "toAccountId" TEXT,
  "interval" TEXT NOT NULL DEFAULT 'monthly',
  "dayOfMonth" INTEGER,
  "dayOfWeek" INTEGER,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "nextRunDate" TIMESTAMP(3),
  "lastProcessedAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction"("userId");
CREATE INDEX "RecurringTransaction_nextRunDate_idx" ON "RecurringTransaction"("nextRunDate");
CREATE INDEX "RecurringTransaction_categoryKey_idx" ON "RecurringTransaction"("categoryKey");

ALTER TABLE "TransactionCategory"
ADD CONSTRAINT "TransactionCategory_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Budget"
ADD CONSTRAINT "Budget_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringTransaction"
ADD CONSTRAINT "RecurringTransaction_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RecurringTransaction"
ADD CONSTRAINT "RecurringTransaction_accountId_fkey"
FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringTransaction"
ADD CONSTRAINT "RecurringTransaction_fromAccountId_fkey"
FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RecurringTransaction"
ADD CONSTRAINT "RecurringTransaction_toAccountId_fkey"
FOREIGN KEY ("toAccountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;
