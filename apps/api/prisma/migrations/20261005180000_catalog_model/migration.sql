-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PricingBasis" AS ENUM ('MARKUP_ON_COST', 'MARGIN_ON_PRICE');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "listPriceDiscountPercent" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" SERIAL NOT NULL,
    "isbn13" VARCHAR(13) NOT NULL,
    "title" TEXT NOT NULL,
    "publisherId" INTEGER,
    "imprintName" TEXT,
    "productForm" VARCHAR(2),
    "languageCode" VARCHAR(3),
    "pageCount" INTEGER,
    "heightMm" INTEGER,
    "widthMm" INTEGER,
    "weightGrams" INTEGER,
    "publishingStatus" VARCHAR(2),
    "publishedOn" DATE,
    "description" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookContributor" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "roleCode" VARCHAR(3) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BookContributor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOffer" (
    "id" SERIAL NOT NULL,
    "bookId" INTEGER NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "recordReference" VARCHAR(100) NOT NULL,
    "supplierProductId" VARCHAR(100),
    "availabilityCode" VARCHAR(2) NOT NULL,
    "availableFrom" DATE,
    "currencyCode" CHAR(3) NOT NULL,
    "listPriceExcludingTax" DECIMAL(10,2),
    "listPriceIncludingTax" DECIMAL(10,2),
    "fixedPriceExcludingTax" DECIMAL(10,2),
    "taxRatePercent" DECIMAL(5,2),
    "netCostAmount" DECIMAL(10,2),
    "netCostPriceType" VARCHAR(2),
    "salePriceOverride" DECIMAL(10,2),
    "sourceSentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(64) NOT NULL,
    "basis" "PricingBasis" NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_supplierId_code_key" ON "Publisher"("supplierId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Book_isbn13_key" ON "Book"("isbn13");

-- CreateIndex
CREATE INDEX "Book_publisherId_idx" ON "Book"("publisherId");

-- CreateIndex
CREATE UNIQUE INDEX "BookContributor_bookId_sequence_key" ON "BookContributor"("bookId", "sequence");

-- CreateIndex
CREATE INDEX "SupplierOffer_bookId_idx" ON "SupplierOffer"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierOffer_supplierId_recordReference_key" ON "SupplierOffer"("supplierId", "recordReference");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierOffer_supplierId_bookId_key" ON "SupplierOffer"("supplierId", "bookId");

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_name_key" ON "PricingRule"("name");

-- AddForeignKey
ALTER TABLE "Publisher" ADD CONSTRAINT "Publisher_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookContributor" ADD CONSTRAINT "BookContributor_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOffer" ADD CONSTRAINT "SupplierOffer_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

