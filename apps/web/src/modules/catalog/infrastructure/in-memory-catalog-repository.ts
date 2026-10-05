import type { CatalogRepository, SearchPage } from "../application/catalog-repository";
import type { AvailabilityFilter, Book } from "../domain/book";
import { filterByAvailability, matchBooks } from "../domain/search-matching";
import type { SearchQuery } from "../domain/search-query";

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(private readonly books: readonly Book[]) {}

  async search(
    query: SearchQuery,
    availability: AvailabilityFilter,
    page: { offset: number; limit: number },
  ): Promise<SearchPage> {
    const matches = filterByAvailability(matchBooks(this.books, query), availability);
    return { items: matches.slice(page.offset, page.offset + page.limit), total: matches.length };
  }

  async findByCode(code: string): Promise<Book | null> {
    return this.books.find((book) => book.code === code) ?? null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    return this.books.find((book) => book.isbn === isbn) ?? null;
  }
}
