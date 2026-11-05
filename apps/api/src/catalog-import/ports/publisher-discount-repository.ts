export interface ApplyBrandDiscountInput {
  /** `Supplier.code` whose publishers are updated. */
  supplierCode: string;
  brand: string;
  /** Two-decimal string, e.g. "35.00". */
  percent: string;
  /** Feed name variants, matched trimmed and case-insensitively. */
  names: readonly string[];
}

/** Writes publisher brands and discounts. Implemented by the Prisma adapter. */
export interface PublisherDiscountRepository {
  /** Sets brand and discount on every matching publisher; returns the count. */
  applyBrand(input: ApplyBrandDiscountInput): Promise<number>;
}
