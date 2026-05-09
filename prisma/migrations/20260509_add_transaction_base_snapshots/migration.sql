ALTER TABLE "Transaction"
ADD COLUMN "baseCurrencySnapshot" TEXT,
ADD COLUMN "baseAmountSnapshot" DOUBLE PRECISION,
ADD COLUMN "exchangeToBaseAmountSnapshot" DOUBLE PRECISION,
ADD COLUMN "snapshotRateApplied" DOUBLE PRECISION,
ADD COLUMN "snapshotRateDate" TIMESTAMP(3),
ADD COLUMN "snapshotRateSource" TEXT;
