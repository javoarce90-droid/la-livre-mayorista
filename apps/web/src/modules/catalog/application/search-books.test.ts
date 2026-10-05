import { describe, expect, it } from "vitest";
import { normalizeText } from "@/shared/lib/text";
import { InMemoryCatalogRepository } from "../infrastructure/in-memory-catalog-repository";
import { SEED_BOOKS } from "../infrastructure/seed-books";
import { searchBooks } from "./search-books";
import { getBook } from "./get-book";

const catalog = new InMemoryCatalogRepository(SEED_BOOKS);
const base = { availability: "all" as const, offset: 0, limit: 20, discountPercent: 10 };

describe("seed", () => {
  it("has around sixty books with unique codes and valid ISBN-13", () => {
    expect(SEED_BOOKS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(SEED_BOOKS.map((b) => b.code)).size).toBe(SEED_BOOKS.length);
    expect(new Set(SEED_BOOKS.map((b) => b.isbn)).size).toBe(SEED_BOOKS.length);
    expect(SEED_BOOKS.every((b) => /^\d{13}$/.test(b.isbn))).toBe(true);
  });
});

describe("searchBooks", () => {
  it("returns parse errors without hitting the repository", async () => {
    expect(await searchBooks(catalog, { ...base, input: "XFOO" })).toEqual({ ok: false, error: "unknown_field" });
  });

  it("positions by title starting at the text", async () => {
    const result = await searchBooks(catalog, { ...base, input: "TCASA" });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.items[0].title).toBe("Casa tomada y otros cuentos");
    const titles = result.value.items.map((b) => normalizeText(b.title));
    expect([...titles].sort()).toEqual(titles);
  });

  it("finds every Borges book with +A", async () => {
    const result = await searchBooks(catalog, { ...base, input: "+aborges" });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.items.map((b) => b.title).sort()).toEqual(["Cuentos completos", "El Aleph", "Ficciones"]);
  });

  it("combines criteria", async () => {
    const result = await searchBooks(catalog, { ...base, input: "+TCUENTOS +AQUIROGA" });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.items.map((b) => b.title)).toEqual([
      "Cuentos de amor de locura y de muerte",
      "Cuentos de la selva",
    ]);
  });

  it("finds a book by scanned barcode", async () => {
    const isbn = SEED_BOOKS[3].isbn;
    const result = await searchBooks(catalog, { ...base, input: `*${isbn}*` });
    expect(result.ok && result.value.items.map((b) => b.title)).toEqual(["Ficciones"]);
  });

  it("applies the availability filter", async () => {
    const result = await searchBooks(catalog, { ...base, input: "TA", availability: "immediate" });
    if (!result.ok) throw new Error(result.error);
    expect(result.value.items.every((b) => b.availability === "immediate")).toBe(true);
  });

  it("paginates in batches and reports the next offset", async () => {
    const first = await searchBooks(catalog, { ...base, input: "TA", limit: 10 });
    if (!first.ok) throw new Error(first.error);
    expect(first.value.items).toHaveLength(10);
    expect(first.value.nextOffset).toBe(10);

    const last = await searchBooks(catalog, { ...base, input: "TA", offset: 55, limit: 10 });
    if (!last.ok) throw new Error(last.error);
    expect(last.value.nextOffset).toBeNull();
    expect(last.value.items.length).toBe(last.value.total - 55);
  });

  it("prices each book with the account discount and promotion", async () => {
    const result = await searchBooks(catalog, { ...base, input: "TCASA TOMADA" });
    if (!result.ok) throw new Error(result.error);
    const [book] = result.value.items;
    expect(book.price.discountPercent).toBe(10);
    expect(book.price.promotionPercent).toBe(5);
    expect(book.price.netPrice).toBeLessThan(book.price.listPrice);
  });
});

describe("getBook", () => {
  it("returns a priced book by code", async () => {
    const book = await getBook(catalog, { code: SEED_BOOKS[0].code, discountPercent: 10 });
    expect(book?.title).toBe("Rayuela");
    expect(book?.price.netPrice).toBe(Math.round(SEED_BOOKS[0].listPrice * 0.9));
  });

  it("returns null for unknown codes", async () => {
    expect(await getBook(catalog, { code: "nope", discountPercent: 10 })).toBeNull();
  });
});
