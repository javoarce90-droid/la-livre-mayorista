import type { Result } from "@/shared/lib/result";
import { ok } from "@/shared/lib/result";
import type { AvailabilityFilter } from "../domain/book";
import { parseSearchQuery, type SearchQueryError } from "../domain/search-query";
import { toBookView, type BookView } from "./book-view";
import type { CatalogRepository } from "./catalog-repository";

export const SEARCH_BATCH_SIZE = 20;

export interface SearchBooksInput {
  input: string;
  availability: AvailabilityFilter;
  offset: number;
  limit?: number;
  discountPercent: number;
}

export interface SearchBooksOutput {
  items: BookView[];
  total: number;
  /** Offset for "Buscar más resultados", or null when there is nothing left. */
  nextOffset: number | null;
}

export async function searchBooks(
  catalog: CatalogRepository,
  { input, availability, offset, limit = SEARCH_BATCH_SIZE, discountPercent }: SearchBooksInput,
): Promise<Result<SearchBooksOutput, SearchQueryError>> {
  const parsed = parseSearchQuery(input);
  if (!parsed.ok) return parsed;
  const page = await catalog.search(parsed.value, availability, { offset, limit });
  const end = offset + page.items.length;
  return ok({
    items: page.items.map((book) => toBookView(book, discountPercent)),
    total: page.total,
    nextOffset: end < page.total ? end : null,
  });
}
