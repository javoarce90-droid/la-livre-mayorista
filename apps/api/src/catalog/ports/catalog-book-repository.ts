import type { CatalogBookRecord } from '../domain/catalog-book.js';
import type { CatalogSearchCriteria } from '../domain/search-criteria.js';

/**
 * Read side of the catalog. Implementations return only SELLABLE books:
 * - the publisher has a discount (null means "not sold");
 * - the book has an offer in CATALOG_SOURCE_CURRENCY that is immediately
 *   available (ONIX List 65 "20" Available or "21" In stock);
 * - that offer can be priced (list price excluding tax or a manual sale
 *   price override).
 */
export interface CatalogBookRepository {
  /** One page ordered by title, plus the total number of matches. */
  search(
    criteria: CatalogSearchCriteria,
  ): Promise<{ records: CatalogBookRecord[]; total: number }>;
  findByIsbn(isbn: string): Promise<CatalogBookRecord | null>;
  /** Distinct brands of the publishers with at least one sellable book. */
  sellablePublishers(): Promise<string[]>;
}
