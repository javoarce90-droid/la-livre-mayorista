-- AlterEnum
ALTER TYPE "PricingBasis" ADD VALUE 'ADJUSTMENT_ON_LIST_PRICE';

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" SERIAL NOT NULL,
    "baseCurrency" CHAR(3) NOT NULL,
    "quoteCurrency" CHAR(3) NOT NULL,
    "rate" DECIMAL(14,4) NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_baseCurrency_quoteCurrency_effectiveFrom_idx" ON "ExchangeRate"("baseCurrency", "quoteCurrency", "effectiveFrom" DESC);

-- Same policy as 20261005190000_enable_rls: RLS on and no policies, so the
-- Supabase Data API cannot read it; the NestJS API role bypasses RLS.
ALTER TABLE "ExchangeRate" ENABLE ROW LEVEL SECURITY;
