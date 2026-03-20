-- Bring deployments created from the legacy 0_init schema closer to the
-- current Prisma schema without requiring destructive table rebuilds.

-- ----------------------------------------------------------------------------
-- User settings
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Setting'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'UserSetting'
  ) THEN
    ALTER TABLE "public"."Setting" RENAME TO "UserSetting";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "public"."UserSetting" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UserSetting_userId_idx" ON "public"."UserSetting"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "UserSetting_userId_key_key" ON "public"."UserSetting"("userId", "key");

-- ----------------------------------------------------------------------------
-- Currency and exchange rates
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."Currency" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "symbol" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Currency_code_key" ON "public"."Currency"("code");
CREATE INDEX IF NOT EXISTS "Currency_code_idx" ON "public"."Currency"("code");

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExchangeRate' AND column_name = 'from'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExchangeRate' AND column_name = 'fromCurrency'
  ) THEN
    ALTER TABLE "public"."ExchangeRate" RENAME COLUMN "from" TO "fromCurrency";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExchangeRate' AND column_name = 'to'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExchangeRate' AND column_name = 'toCurrency'
  ) THEN
    ALTER TABLE "public"."ExchangeRate" RENAME COLUMN "to" TO "toCurrency";
  END IF;
END $$;

ALTER TABLE "public"."ExchangeRate"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "source" TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "ExchangeRate_userId_idx" ON "public"."ExchangeRate"("userId");
CREATE INDEX IF NOT EXISTS "ExchangeRate_fromCurrency_idx" ON "public"."ExchangeRate"("fromCurrency");
CREATE INDEX IF NOT EXISTS "ExchangeRate_toCurrency_idx" ON "public"."ExchangeRate"("toCurrency");
CREATE UNIQUE INDEX IF NOT EXISTS "ExchangeRate_userId_fromCurrency_toCurrency_key"
  ON "public"."ExchangeRate"("userId", "fromCurrency", "toCurrency");

-- ----------------------------------------------------------------------------
-- Transaction categories and transactions
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."TransactionCategory"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "color" TEXT,
  ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'expense',
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "TransactionCategory_key_key";
CREATE INDEX IF NOT EXISTS "TransactionCategory_key_idx" ON "public"."TransactionCategory"("key");
CREATE INDEX IF NOT EXISTS "TransactionCategory_userId_idx" ON "public"."TransactionCategory"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "TransactionCategory_userId_key_key"
  ON "public"."TransactionCategory"("userId", "key");

ALTER TABLE "public"."Transaction"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "categoryKey" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

CREATE INDEX IF NOT EXISTS "Transaction_userId_idx" ON "public"."Transaction"("userId");
CREATE INDEX IF NOT EXISTS "Transaction_categoryKey_idx" ON "public"."Transaction"("categoryKey");

-- ----------------------------------------------------------------------------
-- Holdings and goals
-- ----------------------------------------------------------------------------
ALTER TABLE "public"."Holding"
  ADD COLUMN IF NOT EXISTS "userId" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT,
  ADD COLUMN IF NOT EXISTS "marketPrice" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "investmentType" TEXT NOT NULL DEFAULT 'stock',
  ADD COLUMN IF NOT EXISTS "region" TEXT;

CREATE INDEX IF NOT EXISTS "Holding_userId_idx" ON "public"."Holding"("userId");
CREATE INDEX IF NOT EXISTS "Holding_investmentType_idx" ON "public"."Holding"("investmentType");

ALTER TABLE "public"."Goal"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "targetCurrency" TEXT NOT NULL DEFAULT 'JPY',
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- Tables present in the current Prisma schema but missing from the legacy init
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "public"."NISAAccount" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "nisaType" TEXT NOT NULL,
  "annualLimit" DOUBLE PRECISION NOT NULL DEFAULT 1200000,
  "usedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NISAAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NISAAccount_accountId_key" ON "public"."NISAAccount"("accountId");
CREATE INDEX IF NOT EXISTS "NISAAccount_userId_idx" ON "public"."NISAAccount"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "NISAAccount_userId_nisaType_key"
  ON "public"."NISAAccount"("userId", "nisaType");

CREATE TABLE IF NOT EXISTS "public"."Budget" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Budget_userId_idx" ON "public"."Budget"("userId");
CREATE INDEX IF NOT EXISTS "Budget_categoryKey_idx" ON "public"."Budget"("categoryKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Budget_userId_categoryKey_period_year_month_key"
  ON "public"."Budget"("userId", "categoryKey", "period", "year", "month");

CREATE TABLE IF NOT EXISTS "public"."RecurringTransaction" (
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
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "RecurringTransaction_userId_idx" ON "public"."RecurringTransaction"("userId");
CREATE INDEX IF NOT EXISTS "RecurringTransaction_nextRunDate_idx" ON "public"."RecurringTransaction"("nextRunDate");
CREATE INDEX IF NOT EXISTS "RecurringTransaction_categoryKey_idx" ON "public"."RecurringTransaction"("categoryKey");
