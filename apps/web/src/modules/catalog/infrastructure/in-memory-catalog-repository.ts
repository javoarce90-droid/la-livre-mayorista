import type { CatalogFacets, CatalogRepository, SearchPage } from "../application/catalog-repository";
import type { Book } from "../domain/book";
import { applyFilters, type SearchFilters } from "../domain/search-filters";
import { matchBooks, sortBooksByTitle } from "../domain/search-matching";
import type { SearchQuery } from "../domain/search-query";

const byName = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "base" });

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(private readonly books: readonly Book[]) {}

  async search(
    query: SearchQuery | null,
    filters: SearchFilters,
    page: { offset: number; limit: number },
  ): Promise<SearchPage> {
    const candidates = query ? matchBooks(this.books, query) : sortBooksByTitle(this.books);
    const matches = applyFilters(candidates, filters);
    return { items: matches.slice(page.offset, page.offset + page.limit), total: matches.length };
  }

  async facets(): Promise<CatalogFacets> {
    return {
      publishers: [...new Set(this.books.map((book) => book.publisher))].sort(byName),
      subjects: [...new Set(this.books.map((book) => book.subject))].sort(byName),
    };
  }

  async findByCode(code: string): Promise<Book | null> {
    return this.books.find((book) => book.code === code) ?? null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    return this.books.find((book) => book.isbn === isbn) ?? null;
  }
}
