import { describe, expect, it } from "vitest";
import { normalizeText } from "@/shared/lib/text";
import { NO_FILTERS } from "../domain/search-filters";
import { InMemoryCatalogRepository } from "../infrastructure/in-memory-catalog-repository";
import { SEED_BOOKS } from "../infrastructure/seed-books";
import { getCatalogFacets } from "./get-catalog-facets";
import { getBook } from "./get-book";
import { searchBooks } from "./search-books";

const catalog = new InMemoryCatalogRepository(SEED_BOOKS);
const base = { offset: 0, limit: 20, discountPercent: 10 };

async function search(input: string, extra: Partial<Parameters<typeof searchBooks>[1]> = {}) {
  const result = await searchBooks(catalog, { ...base, input, ...extra });
  if (!result.ok) throw new Error(result.error);
  return result.value;
}

describe("seed", () => {
  it("has around sixty books with unique codes and valid ISBN-13", () => {
    expect(SEED_BOOKS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(SEED_BOOKS.map((b) => b.code)).size).toBe(SEED_BOOKS.length);
    expect(new Set(SEED_BOOKS.map((b) => b.isbn)).size).toBe(SEED_BOOKS.length);
    expect(SEED_BOOKS.every((b) => /^\d{13}$/.test(b.isbn))).toBe(true);
  });
});

describe("searchBooks — plain text", () => {
  it("finds a title typed directly, without the T prefix", async () => {
    const result = await search("casa tomada");
    expect(result.items.map((b) => b.title)).toEqual(["Casa tomada y otros cuentos"]);
    expect(result.interpretedAs).toBeNull();
  });

  it("finds every Borges book by author name", async () => {
    const result = await search("borges");
    expect(result.items.map((b) => b.title).sort()).toEqual(["Cuentos completos", "El Aleph", "Ficciones"]);
  });

  it("finds a book by ISBN typed with dashes", async () => {
    const isbn = SEED_BOOKS[3].isbn;
    const dashed = `${isbn.slice(0, 3)}-${isbn.slice(3, 6)}-${isbn.slice(6)}`;
    expect((await search(dashed)).items.map((b) => b.title)).toEqual(["Ficciones"]);
  });

  it("finds a book by scanned barcode", async () => {
    expect((await search(`*${SEED_BOOKS[3].isbn}*`)).items.map((b) => b.title)).toEqual(["Ficciones"]);
  });

  it("returns parse errors for malformed shortcuts", async () => {
    expect(await searchBooks(catalog, { ...base, input: "+XFOO" })).toEqual({ ok: false, error: "unknown_field" });
  });

  it("asks for text when there is neither text nor filters", async () => {
    expect(await searchBooks(catalog, { ...base, input: "  " })).toEqual({ ok: false, error: "empty" });
  });
});

describe("searchBooks — legacy shortcuts keep working", () => {
  it("falls back to the letter shortcut when the plain text finds nothing", async () => {
    const result = await search("ABORGES");
    expect(result.interpretedAs).toEqual({ kind: "position", field: "author", text: "BORGES" });
    expect(result.items[0].author).toBe("Borges, Jorge Luis");
  });

  it("prefers the literal text when it matches (a title starting with A is not read as Autor)", async () => {
    const result = await search("Aleph");
    expect(result.interpretedAs).toBeNull();
    expect(result.items.map((b) => b.title)).toEqual(["El Aleph"]);
  });

  it("keeps the fallback when paginating", async () => {
    const result = await search("ABORGES", { offset: 1, limit: 1 });
    expect(result.interpretedAs).toEqual({ kind: "position", field: "author", text: "BORGES" });
    expect(result.items).toHaveLength(1);
  });

  it("combines + criteria", async () => {
    const result = await search("+TCUENTOS +AQUIROGA");
    expect(result.items.map((b) => b.title)).toEqual(["Cuentos de amor de locura y de muerte", "Cuentos de la selva"]);
  });
});

describe("searchBooks — filters", () => {
  it("combines text with filters", async () => {
    const result = await search("cuentos", { filters: { ...NO_FILTERS, author: "quiroga" } });
    expect(result.items.map((b) => b.title)).toEqual(["Cuentos de amor de locura y de muerte", "Cuentos de la selva"]);
  });

  it("searches with filters only, ordered by title", async () => {
    const result = await search("", { filters: { ...NO_FILTERS, publisher: "Anagrama", availability: "immediate" } });
    expect(result.total).toBeGreaterThan(0);
    expect(result.items.every((b) => b.publisher === "Anagrama" && b.availability === "immediate")).toBe(true);
    const titles = result.items.map((b) => normalizeText(b.title));
    expect(titles).toEqual([...titles].sort());
  });

  it("counts the total after filtering, not just the loaded page", async () => {
    const all = await search("", { filters: { ...NO_FILTERS, availability: "all", subject: "Narrativa" }, limit: 5 });
    const expected = SEED_BOOKS.filter((b) => b.subject === "Narrativa").length;
    expect(all.total).toBe(expected);
    expect(all.items).toHaveLength(Math.min(5, expected));
  });
});

describe("searchBooks — pagination and pricing", () => {
  it("paginates in batches and reports the next offset", async () => {
    const everything = { ...NO_FILTERS, availability: "immediate_and_on_order" as const };
    const first = await search("", { filters: everything, limit: 10 });
    expect(first.items).toHaveLength(10);
    expect(first.nextOffset).toBe(10);

    const lastOffset = first.total - 3;
    const last = await search("", { filters: everything, offset: lastOffset, limit: 10 });
    expect(last.nextOffset).toBeNull();
    expect(last.items).toHaveLength(3);
  });

  it("prices each book with the account discount and promotion", async () => {
    const [book] = (await search("casa tomada")).items;
    expect(book.price.discountPercent).toBe(10);
    expect(book.price.promotionPercent).toBe(5);
    expect(book.price.netPrice).toBeLessThan(book.price.listPrice);
  });
});

describe("getCatalogFacets", () => {
  it("lists unique publishers and subjects, sorted", async () => {
    const facets = await getCatalogFacets(catalog);
    expect(facets.publishers).toContain("Anagrama");
    expect(new Set(facets.publishers).size).toBe(facets.publishers.length);
    expect(facets.subjects).toContain("Cuentos");
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
