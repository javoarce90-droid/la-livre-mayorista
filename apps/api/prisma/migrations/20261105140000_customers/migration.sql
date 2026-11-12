-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "authUserId" UUID,
    "email" VARCHAR(254) NOT NULL,
    "businessName" VARCHAR(200) NOT NULL,
    "taxId" CHAR(11),
    "phone" VARCHAR(32),
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id"),
    -- The application normalizes emails to lowercase; the unique index relies on it.
    CONSTRAINT "Customer_email_lowercase" CHECK ("email" = lower("email")),
    CONSTRAINT "Customer_taxId_digits" CHECK ("taxId" ~ '^[0-9]{11}$')
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_authUserId_key" ON "Customer"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");

-- Same policy as 20261005190000_enable_rls: RLS on and no policies, so the
-- Supabase Data API cannot read it; the NestJS API role bypasses RLS.
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
