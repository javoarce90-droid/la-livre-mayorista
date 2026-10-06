"use server";

import { container } from "@/composition";
import { requirePortalContext } from "@/portal-context";
import type { BookView } from "../application/book-view";
import { searchBooks } from "../application/search-books";
import { sanitizeFilters, type SearchFilters } from "../domain/search-filters";
import { interpretationNotice, searchErrorMessage } from "./messages";

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
  const result = await searchBooks(container().catalog, {
    input: String(input.query ?? ""),
    filters: sanitizeFilters(input.filters),
    offset,
    discountPercent: account.discountPercent,
  });
  if (!result.ok) return { ok: false, message: searchErrorMessage(result.error) };
  const { interpretedAs, ...page } = result.value;
  return { ok: true, ...page, notice: interpretedAs ? interpretationNotice(interpretedAs) : null };
}
