import { normalizeText } from "@/shared/lib/text";
import type { Availability, AvailabilityFilter, Book } from "./book";
import type { SearchField, SearchQuery } from "./search-query";

function fieldValue(book: Book, field: SearchField): string {
  switch (field) {
    case "title":
      return book.title;
    case "author":
      return book.author;
    case "publisher":
      return book.publisher;
    case "isbn":
      return book.isbn;
    case "code":
      return book.code;
  }
}

const compareText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function sortByField(books: Book[], field: SearchField): Book[] {
  return [...books].sort(
    (a, b) =>
      compareText(normalizeText(fieldValue(a, field)), normalizeText(fieldValue(b, field))) ||
      compareText(normalizeText(a.title), normalizeText(b.title)) ||
      compareText(a.code, b.code),
  );
}

function isExactField(field: SearchField): boolean {
  return field === "isbn" || field === "code";
}

/** Applies a parsed query to a list of books, returning matches in display order. */
export function matchBooks(books: readonly Book[], query: SearchQuery): Book[] {
  switch (query.kind) {
    case "barcode":
      return books.filter((book) => book.isbn === query.isbn);

    case "contains": {
      const matches = books.filter((book) =>
        query.criteria.every(({ field, text }) =>
          isExactField(field)
            ? fieldValue(book, field) === text.trim()
            : normalizeText(fieldValue(book, field)).includes(normalizeText(text)),
        ),
      );
      return sortByField(matches, "title");
    }

    case "position": {
      const { field } = query;
      if (isExactField(field)) {
        return books.filter((book) => fieldValue(book, field) === query.text.trim());
      }
      const text = normalizeText(query.text);
      const matches =
        field === "publisher"
          ? books.filter((book) => normalizeText(book.publisher).startsWith(text))
          : books.filter((book) => normalizeText(fieldValue(book, field)) >= text);
      return sortByField(matches, field);
    }
  }
}

const ALLOWED: Record<AvailabilityFilter, readonly Availability[]> = {
  all: ["immediate", "on_order", "out_of_stock"],
  immediate: ["immediate"],
  immediate_and_on_order: ["immediate", "on_order"],
};

export function filterByAvailability<T extends { availability: Availability }>(
  items: readonly T[],
  filter: AvailabilityFilter,
): T[] {
  return items.filter((item) => ALLOWED[filter].includes(item.availability));
}
