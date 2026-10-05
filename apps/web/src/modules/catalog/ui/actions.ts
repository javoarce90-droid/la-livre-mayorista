"use server";

import { container } from "@/composition";
import { requirePortalContext } from "@/portal-context";
import type { BookView } from "../application/book-view";
import { searchBooks } from "../application/search-books";
import type { AvailabilityFilter } from "../domain/book";
import { searchErrorMessage } from "./messages";

export type SearchActionResult =
  | { ok: true; items: BookView[]; total: number; nextOffset: number | null }
  | { ok: false; message: string };

const FILTERS: readonly AvailabilityFilter[] = ["all", "immediate", "immediate_and_on_order"];

export async function searchBooksAction(input: {
  query: string;
  availability: AvailabilityFilter;
  offset: number;
}): Promise<SearchActionResult> {
  const { account } = await requirePortalContext();
  const availability = FILTERS.includes(input.availability) ? input.availability : "all";
  const offset = Number.isInteger(input.offset) && input.offset >= 0 ? input.offset : 0;
  const result = await searchBooks(container().catalog, {
    input: String(input.query ?? ""),
    availability,
    offset,
    discountPercent: account.discountPercent,
  });
  return result.ok ? { ok: true, ...result.value } : { ok: false, message: searchErrorMessage(result.error) };
}
