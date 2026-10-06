import { normalizeText } from "@/shared/lib/text";
import type { Availability, AvailabilityFilter, Book } from "./book";

/** Structured filters that combine (AND) with the text search. Empty string = not filtering. */
export interface SearchFilters {
  author: string;
  publisher: string;
  subject: string;
  availability: AvailabilityFilter;
  promotionOnly: boolean;
}

export const NO_FILTERS: SearchFilters = {
  author: "",
  publisher: "",
  subject: "",
  availability: "all",
  promotionOnly: false,
};

export const AVAILABILITY_FILTERS: readonly AvailabilityFilter[] = ["all", "immediate", "immediate_and_on_order"];

const MAX_TEXT_LENGTH = 100;

const ALLOWED: Record<AvailabilityFilter, readonly Availability[]> = {
  all: ["immediate", "on_order", "out_of_stock"],
  immediate: ["immediate"],
  immediate_and_on_order: ["immediate", "on_order"],
};

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT_LENGTH) : "";
}

/** Coerces untrusted input (server action payload) into valid filters. */
export function sanitizeFilters(input: Partial<Record<keyof SearchFilters, unknown>> | undefined | null): SearchFilters {
  if (!input) return NO_FILTERS;
  const availability = AVAILABILITY_FILTERS.includes(input.availability as AvailabilityFilter)
    ? (input.availability as AvailabilityFilter)
    : "all";
  return {
    author: cleanText(input.author),
    publisher: cleanText(input.publisher),
    subject: cleanText(input.subject),
    availability,
    promotionOnly: input.promotionOnly === true,
  };
}

export function activeFilterCount(filters: SearchFilters): number {
  return [
    filters.author.trim() !== "",
    filters.publisher.trim() !== "",
    filters.subject.trim() !== "",
    filters.availability !== "all",
    filters.promotionOnly,
  ].filter(Boolean).length;
}

/** Every word must appear, in any order: "julio cortazar" matches "Cortázar, Julio". */
function containsWords(value: string, query: string): boolean {
  const haystack = normalizeText(value);
  return normalizeText(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

export function filterByAvailability<T extends { availability: Availability }>(
  items: readonly T[],
  filter: AvailabilityFilter,
): T[] {
  return items.filter((item) => ALLOWED[filter].includes(item.availability));
}

export function matchesFilters(book: Book, filters: SearchFilters): boolean {
  if (filters.author && !containsWords(book.author, filters.author)) return false;
  if (filters.publisher && !containsWords(book.publisher, filters.publisher)) return false;
  if (filters.subject && normalizeText(book.subject) !== normalizeText(filters.subject)) return false;
  if (!ALLOWED[filters.availability].includes(book.availability)) return false;
  if (filters.promotionOnly && !book.promotion) return false;
  return true;
}

export function applyFilters<T extends Book>(books: readonly T[], filters: SearchFilters): T[] {
  return books.filter((book) => matchesFilters(book, filters));
}
