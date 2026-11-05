import type { Availability, Book } from "../domain/book";
import type { SearchFilters } from "../domain/search-filters";
import type { SearchQuery } from "../domain/search-query";

export interface SearchPage {
  items: Book[];
  total: number;
}

/**
 * Values the filter panel can suggest (recognition over recall). Filters with nothing to
 * choose from are hidden: no subjects, a single availability, or no promotions.
 */
export interface CatalogFacets {
  publishers: string[];
  subjects: string[];
  availabilities: Availability[];
  hasPromotions: boolean;
}

/** Port: where the catalog lives (La Livre API, or in-memory seeds for tests and local dev). */
export interface CatalogRepository {
  /** `query` null means "filters only", ordered by title. */
  search(query: SearchQuery | null, filters: SearchFilters, page: { offset: number; limit: number }): Promise<SearchPage>;
  facets(): Promise<CatalogFacets>;
  findByCode(code: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>;
}

/** The catalog cannot be served right now (e.g. the API has no exchange rate configured). */
export class CatalogUnavailableError extends Error {
  constructor(readonly reason: string) {
    super(`Catalog unavailable: ${reason}`);
    this.name = "CatalogUnavailableError";
  }
}
