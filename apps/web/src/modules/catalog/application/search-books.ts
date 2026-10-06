import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";
import { activeFilterCount, NO_FILTERS, type SearchFilters } from "../domain/search-filters";
import { parseLegacyShortcut, parseSearchQuery, type SearchQuery, type SearchQueryError } from "../domain/search-query";
import { toBookView, type BookView } from "./book-view";
import type { CatalogRepository } from "./catalog-repository";

export const SEARCH_BATCH_SIZE = 20;

export interface SearchBooksInput {
  input: string;
  filters?: SearchFilters;
  offset: number;
  limit?: number;
  discountPercent: number;
}

export interface SearchBooksOutput {
  items: BookView[];
  total: number;
  /** Offset for "Mostrar más resultados", or null when there is nothing left. */
  nextOffset: number | null;
  /** Set when plain text found nothing and was re-read as a legacy letter shortcut (ABORGES → Autor). */
  interpretedAs: SearchQuery | null;
}

export async function searchBooks(
  catalog: CatalogRepository,
  { input, filters = NO_FILTERS, offset, limit = SEARCH_BATCH_SIZE, discountPercent }: SearchBooksInput,
): Promise<Result<SearchBooksOutput, SearchQueryError>> {
  let query: SearchQuery | null = null;
  if (input.trim().length > 0) {
    const parsed = parseSearchQuery(input);
    if (!parsed.ok) return parsed;
    query = parsed.value;
  } else if (activeFilterCount(filters) === 0) {
    return err("empty");
  }

  const pageRequest = { offset, limit };
  let page = await catalog.search(query, filters, pageRequest);
  let interpretedAs: SearchQuery | null = null;

  if (query?.kind === "keywords" && page.total === 0) {
    const legacy = parseLegacyShortcut(input);
    if (legacy) {
      const legacyPage = await catalog.search(legacy, filters, pageRequest);
      if (legacyPage.total > 0) {
        page = legacyPage;
        interpretedAs = legacy;
      }
    }
  }

  const end = offset + page.items.length;
  return ok({
    items: page.items.map((book) => toBookView(book, discountPercent)),
    total: page.total,
    nextOffset: end < page.total ? end : null,
    interpretedAs,
  });
}
