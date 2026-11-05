import { AZETA_PUBLISHER_DISCOUNTS } from '../domain/publisher-discounts.js';
import type { PublisherDiscountConfig } from '../domain/publisher-discounts.js';
import type { PublisherDiscountRepository } from '../ports/publisher-discount-repository.js';

export interface BrandDiscountReport {
  brand: string;
  percent: string;
  /** Publisher rows updated for this brand. */
  updated: number;
}

/**
 * Applies the configured publisher discounts to the publishers already in the
 * database, without a re-import. Publishers outside the configuration are left
 * untouched.
 */
export async function applyPublisherDiscounts(
  repository: PublisherDiscountRepository,
  config: PublisherDiscountConfig = AZETA_PUBLISHER_DISCOUNTS,
): Promise<BrandDiscountReport[]> {
  const report: BrandDiscountReport[] = [];
  for (const { brand, percent, names } of config.brands) {
    const updated = await repository.applyBrand({
      supplierCode: config.supplierCode,
      brand,
      percent,
      names,
    });
    report.push({ brand, percent, updated });
  }
  return report;
}
