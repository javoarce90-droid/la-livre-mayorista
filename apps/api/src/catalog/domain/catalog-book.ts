import { convertToMinorUnits } from '../../pricing/domain/currency-conversion.js';
import type {
  DecimalValue,
  PricingRuleTerms,
} from '../../pricing/domain/offer-pricing.js';
import {
  computeSalePrice,
  computeUnitCost,
} from '../../pricing/domain/offer-pricing.js';

/** Currency of the supplier prices the catalog is priced from. */
export const CATALOG_SOURCE_CURRENCY = 'EUR';
/** Currency customers see. */
export const CATALOG_CUSTOMER_CURRENCY = 'ARS';

/** A sellable book as loaded from storage, before pricing. */
export interface CatalogBookRecord {
  isbn: string;
  title: string;
  publishedOn: Date | null;
  languageCode: string | null;
  pageCount: number | null;
  description: string | null;
  coverUrl: string | null;
  /** Publisher brand (display name). */
  publisher: string;
  /** Author names (ONIX role A01) in sequence order. */
  authors: string[];
  offer: {
    currencyCode: string;
    netCostAmount: DecimalValue | null;
    listPriceExcludingTax: DecimalValue | null;
    salePriceOverride: DecimalValue | null;
    publisherDiscountPercent: DecimalValue | null;
    supplierDiscountPercent: DecimalValue | null;
    sourceSentAt: Date;
  };
}

export interface PricingContext {
  rule: PricingRuleTerms;
  exchangeRate: { baseCurrency: string; quoteCurrency: string; rate: string };
}

/** A book as customers see it, priced in the customer currency. */
export interface CatalogBook {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number | null;
  language: string | null;
  pages: number | null;
  description: string | null;
  coverUrl: string | null;
  /** Price in minor units (cents) of `currency`. */
  priceCents: bigint;
  /** INTERNAL (never sent to customers): unit cost in cents of `currency`. */
  costCents: bigint | null;
  /** INTERNAL (never sent to customers): price − cost, in cents. */
  marginCents: bigint | null;
  currency: string;
  /** When the supplier last sent the prices this one derives from. */
  priceUpdatedAt: Date;
}

export function formatAuthors(authors: readonly string[]): string {
  return authors.join('; ');
}

/**
 * Customer price = sale price (the pricing rule applied to the list price
 * excluding tax, or the manual override) converted with the exchange rate,
 * rounded half up to whole cents. The cost only feeds the internal margin.
 * Null when the offer cannot be priced, so the book must not be shown.
 */
export function priceCatalogBook(
  record: CatalogBookRecord,
  context: PricingContext,
): CatalogBook | null {
  const { offer } = record;
  if (offer.currencyCode !== context.exchangeRate.baseCurrency) return null;

  const cost = computeUnitCost({
    netCostAmount: offer.netCostAmount,
    listPriceExcludingTax: offer.listPriceExcludingTax,
    publisherDiscountPercent: offer.publisherDiscountPercent,
    supplierDiscountPercent: offer.supplierDiscountPercent,
  });
  const salePrice = computeSalePrice(
    {
      cost,
      listPriceExcludingTax: offer.listPriceExcludingTax,
      override: offer.salePriceOverride,
    },
    context.rule,
  );
  if (salePrice === null) return null;

  const { rate } = context.exchangeRate;
  const priceCents = convertToMinorUnits(salePrice, rate);
  const costCents = cost === null ? null : convertToMinorUnits(cost, rate);

  return {
    isbn: record.isbn,
    title: record.title,
    author: formatAuthors(record.authors),
    publisher: record.publisher,
    year: record.publishedOn?.getUTCFullYear() ?? null,
    language: record.languageCode,
    pages: record.pageCount,
    description: record.description,
    coverUrl: record.coverUrl,
    priceCents,
    costCents,
    marginCents: costCents === null ? null : priceCents - costCents,
    currency: context.exchangeRate.quoteCurrency,
    priceUpdatedAt: offer.sourceSentAt,
  };
}
