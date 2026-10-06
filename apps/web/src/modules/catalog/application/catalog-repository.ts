import type { Book } from "../domain/book";
import type { SearchFilters } from "../domain/search-filters";
import type { SearchQuery } from "../domain/search-query";

export interface SearchPage {
  items: Book[];
  total: number;
}

/** Values the filter panel can suggest (recognition over recall). */
export interface CatalogFacets {
  publishers: string[];
  subjects: string[];
}

/** Port: where the catalog lives (in-memory today, La Livre API tomorrow). */
export interface CatalogRepository {
  /** `query` null means "filters only", ordered by title. */
  search(query: SearchQuery | null, filters: SearchFilters, page: { offset: number; limit: number }): Promise<SearchPage>;
  facets(): Promise<CatalogFacets>;
  findByCode(code: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>;
}
