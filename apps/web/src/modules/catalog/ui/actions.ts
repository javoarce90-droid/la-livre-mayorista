"use server";

import { container } from "@/composition";
import { requirePortalContext } from "@/portal-context";
import type { BookView } from "../application/book-view";
import { CatalogUnavailableError } from "../application/catalog-repository";
import { searchBooks } from "../application/search-books";
import { sanitizeFilters, type SearchFilters } from "../domain/search-filters";
import { CATALOG_UNAVAILABLE_MESSAGE, interpretationNotice, searchErrorMessage } from "./messages";

export type SearchActionResult =
  | { ok: true; items: BookView[]; total: number; nextOffset: number | null; notice: string | null }
  | { ok: false; message: string };

export async function searchBooksAction(input: {
  query: string;
  filters?: Partial<SearchFilters>;
  offset: number;
}): Promise<SearchActionResult> {
  const { account } = await requirePortalContext();
  const offset = Number.isInteger(input.offset) && input.offset >= 0 ? input.offset : 0;
  let result: Awaited<ReturnType<typeof searchBooks>>;
  try {
    result = await searchBooks(container().catalog, {
      input: String(input.query ?? ""),
      filters: sanitizeFilters(input.filters),
      offset,
      discountPercent: account.discountPercent,
    });
  } catch (error) {
    if (error instanceof CatalogUnavailableError) return { ok: false, message: CATALOG_UNAVAILABLE_MESSAGE };
    throw error;
  }
  if (!result.ok) return { ok: false, message: searchErrorMessage(result.error) };
  const { interpretedAs, ...page } = result.value;
  return { ok: true, ...page, notice: interpretedAs ? interpretationNotice(interpretedAs) : null };
}
