import type { AvailabilityFilter, Book } from "../domain/book";
import type { SearchQuery } from "../domain/search-query";

export interface SearchPage {
  items: Book[];
  total: number;
}

/** Port: where the catalog lives (in-memory today, La Livre API tomorrow). */
export interface CatalogRepository {
  search(query: SearchQuery, availability: AvailabilityFilter, page: { offset: number; limit: number }): Promise<SearchPage>;
  findByCode(code: string): Promise<Book | null>;
  findByIsbn(isbn: string): Promise<Book | null>;
}
