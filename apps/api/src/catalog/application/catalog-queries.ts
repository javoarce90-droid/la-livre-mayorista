import type { PricingSettingsRepository } from '../../pricing/ports/pricing-settings-repository.js';
import type { CatalogBook, PricingContext } from '../domain/catalog-book.js';
import {
  CATALOG_CUSTOMER_CURRENCY,
  CATALOG_SOURCE_CURRENCY,
  priceCatalogBook,
} from '../domain/catalog-book.js';
import { CatalogUnavailableError } from '../domain/catalog-errors.js';
import type { CatalogSearchCriteria } from '../domain/search-criteria.js';
import type { CatalogBookRepository } from '../ports/catalog-book-repository.js';

export interface CatalogQueryDeps {
  books: CatalogBookRepository;
  pricing: PricingSettingsRepository;
  now: () => Date;
}

export interface CatalogPage {
  items: CatalogBook[];
  total: number;
}

/**
 * Loads the pricing rule and the exchange rate in effect. Throws instead of
 * falling back, so prices are never shown in the supplier currency.
 */
async function loadPricingContext({
  pricing,
  now,
}: CatalogQueryDeps): Promise<PricingContext> {
  const [rule, exchangeRate] = await Promise.all([
    pricing.activePricingRule(),
    pricing.latestExchangeRate({
      baseCurrency: CATALOG_SOURCE_CURRENCY,
      quoteCurrency: CATALOG_CUSTOMER_CURRENCY,
      at: now(),
    }),
  ]);
  if (!exchangeRate) throw new CatalogUnavailableError('exchange_rate_missing');
  if (!rule) throw new CatalogUnavailableError('pricing_rule_missing');
  return { rule, exchangeRate };
}

export async function searchCatalogBooks(
  deps: CatalogQueryDeps,
  criteria: CatalogSearchCriteria,
): Promise<CatalogPage> {
  const context = await loadPricingContext(deps);
  const { records, total } = await deps.books.search(criteria);
  const items = records.flatMap((record) => {
    const book = priceCatalogBook(record, context);
    return book ? [book] : [];
  });
  return { items, total };
}

export async function getCatalogBook(
  deps: CatalogQueryDeps,
  isbn: string,
): Promise<CatalogBook | null> {
  const context = await loadPricingContext(deps);
  const record = await deps.books.findByIsbn(isbn);
  return record ? priceCatalogBook(record, context) : null;
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, 'es', { sensitivity: 'base' });

/** Publisher brands offered as filter suggestions (no prices involved). */
export async function listCatalogPublishers(
  books: CatalogBookRepository,
): Promise<string[]> {
  return [...(await books.sellablePublishers())].sort(byName);
}
