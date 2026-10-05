import type { Book } from "./book";

/** Test helper: a valid book with overridable fields. */
export function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    code: "100000",
    isbn: "9789500000000",
    title: "Título de prueba",
    author: "Autor, Prueba",
    publisher: "Editorial de prueba",
    listPrice: 1_000_000,
    priceDate: "2026-08-01",
    recommendedAge: null,
    availability: "immediate",
    subject: "Narrativa",
    year: 2020,
    language: "Español",
    pages: 200,
    review: "Reseña de prueba.",
    promotion: null,
    ...overrides,
  };
}
