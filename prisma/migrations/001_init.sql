-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Currency" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Currency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ExchangeRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromCurrency" TEXT NOT NULL,
    "toCurrency" TEXT NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AccountType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TransactionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Transaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "categoryKey" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Holding" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT,
    "shares" DOUBLE PRECISION NOT NULL,
    "costBasis" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "marketPrice" DOUBLE PRECISION,
    "investmentType" TEXT NOT NULL,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Holding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NISAAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "nisaType" TEXT NOT NULL,
    "annualLimit" DOUBLE PRECISION NOT NULL DEFAULT 1200000,
    "usedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NISAAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetAmount" DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetCurrency" TEXT NOT NULL,
    "targetDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "userId" TEXT,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "UserSetting_userId_idx" ON "public"."UserSetting"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSetting_userId_key_key" ON "public"."UserSetting"("userId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Currency_code_key" ON "public"."Currency"("code");

-- CreateIndex
CREATE INDEX "Currency_code_idx" ON "public"."Currency"("code");

-- CreateIndex
CREATE INDEX "ExchangeRate_userId_idx" ON "public"."ExchangeRate"("userId");

-- CreateIndex
CREATE INDEX "ExchangeRate_fromCurrency_idx" ON "public"."ExchangeRate"("fromCurrency");

-- CreateIndex
CREATE INDEX "ExchangeRate_toCurrency_idx" ON "public"."ExchangeRate"("toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_userId_fromCurrency_toCurrency_key" ON "public"."ExchangeRate"("userId", "fromCurrency", "toCurrency");

-- CreateIndex
CREATE UNIQUE INDEX "AccountType_key_key" ON "public"."AccountType"("key");

-- CreateIndex
CREATE INDEX "AccountType_key_idx" ON "public"."AccountType"("key");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId");

-- CreateIndex
CREATE INDEX "Account_type_idx" ON "public"."Account"("type");

-- CreateIndex
CREATE INDEX "Account_currency_idx" ON "public"."Account"("currency");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_key_key" ON "public"."TransactionCategory"("key");

-- CreateIndex
CREATE INDEX "TransactionCategory_key_idx" ON "public"."TransactionCategory"("key");

-- CreateIndex
CREATE INDEX "Transaction_userId_idx" ON "public"."Transaction"("userId");

-- CreateIndex
CREATE INDEX "Transaction_accountId_idx" ON "public"."Transaction"("accountId");

-- CreateIndex
CREATE INDEX "Transaction_fromAccountId_idx" ON "public"."Transaction"("fromAccountId");

-- CreateIndex
CREATE INDEX "Transaction_toAccountId_idx" ON "public"."Transaction"("toAccountId");

-- CreateIndex
CREATE INDEX "Transaction_date_idx" ON "public"."Transaction"("date");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "public"."Transaction"("type");

-- CreateIndex
CREATE INDEX "Holding_userId_idx" ON "public"."Holding"("userId");

-- CreateIndex
CREATE INDEX "Holding_accountId_idx" ON "public"."Holding"("accountId");

-- CreateIndex
CREATE INDEX "Holding_symbol_idx" ON "public"."Holding"("symbol");

-- CreateIndex
CREATE INDEX "Holding_investmentType_idx" ON "public"."Holding"("investmentType");

-- CreateIndex
CREATE UNIQUE INDEX "NISAAccount_accountId_key" ON "public"."NISAAccount"("accountId");

-- CreateIndex
CREATE INDEX "NISAAccount_userId_idx" ON "public"."NISAAccount"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NISAAccount_userId_nisaType_key" ON "public"."NISAAccount"("userId", "nisaType");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "public"."Goal"("userId");

-- CreateIndex
CREATE INDEX "Goal_targetDate_idx" ON "public"."Goal"("targetDate");

-- CreateIndex
CREATE INDEX "SystemLog_userId_idx" ON "public"."SystemLog"("userId");

-- CreateIndex
CREATE INDEX "SystemLog_action_idx" ON "public"."SystemLog"("action");

-- CreateIndex
CREATE INDEX "SystemLog_createdAt_idx" ON "public"."SystemLog"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."UserSetting" ADD CONSTRAINT "UserSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExchangeRate" ADD CONSTRAINT "ExchangeRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_fromAccountId_fkey" FOREIGN KEY ("fromAccountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Transaction" ADD CONSTRAINT "Transaction_toAccountId_fkey" FOREIGN KEY ("toAccountId") REFERENCES "public"."Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Holding" ADD CONSTRAINT "Holding_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Holding" ADD CONSTRAINT "Holding_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NISAAccount" ADD CONSTRAINT "NISAAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NISAAccount" ADD CONSTRAINT "NISAAccount_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "public"."Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

