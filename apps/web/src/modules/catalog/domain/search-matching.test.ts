import { describe, expect, it } from "vitest";
import type { Book } from "./book";
import { filterByAvailability, matchBooks } from "./search-matching";
import { makeBook } from "./test-fixtures";
import type { SearchQuery } from "./search-query";

const books: Book[] = [
  makeBook({ code: "1", isbn: "9780000000001", title: "Rayuela", author: "Cortázar, Julio", publisher: "Alfaguara", availability: "immediate" }),
  makeBook({ code: "2", isbn: "9780000000002", title: "Casa tomada y otros cuentos", author: "Cortázar, Julio", publisher: "Alfaguara", availability: "on_order" }),
  makeBook({ code: "3", isbn: "9780000000003", title: "La casa de los espíritus", author: "Allende, Isabel", publisher: "Debolsillo", availability: "out_of_stock" }),
  makeBook({ code: "4", isbn: "9780000000004", title: "Ficciones", author: "Borges, Jorge Luis", publisher: "Debolsillo", availability: "immediate" }),
  makeBook({ code: "5", isbn: "9780000000005", title: "Cuentos completos", author: "Borges, Jorge Luis", publisher: "Emecé", availability: "immediate" }),
  makeBook({ code: "6", isbn: "9780000000006", title: "Cien años de soledad", author: "García Márquez, Gabriel", publisher: "Editorial Sudamericana", availability: "immediate" }),
];

const titles = (result: Book[]) => result.map((b) => b.title);

describe("matchBooks — position search", () => {
  it("positions alphabetically by title starting at the text", () => {
    const query: SearchQuery = { kind: "position", field: "title", text: "CASA" };
    expect(titles(matchBooks(books, query))).toEqual([
      "Casa tomada y otros cuentos",
      "Cien años de soledad",
      "Cuentos completos",
      "Ficciones",
      "La casa de los espíritus",
      "Rayuela",
    ]);
  });

  it("starts after earlier titles", () => {
    const query: SearchQuery = { kind: "position", field: "title", text: "L" };
    expect(titles(matchBooks(books, query))).toEqual(["La casa de los espíritus", "Rayuela"]);
  });

  it("is accent and case insensitive", () => {
    const query: SearchQuery = { kind: "position", field: "author", text: "garcía márquez" };
    expect(titles(matchBooks(books, query))).toEqual(["Cien años de soledad"]);
  });

  it("orders author positioning by author then title", () => {
    const query: SearchQuery = { kind: "position", field: "author", text: "BORGES" };
    expect(titles(matchBooks(books, query))).toEqual([
      "Cuentos completos",
      "Ficciones",
      "Casa tomada y otros cuentos",
      "Rayuela",
      "Cien años de soledad",
    ]);
  });

  it("returns only publishers starting with the text", () => {
    const query: SearchQuery = { kind: "position", field: "publisher", text: "deb" };
    expect(titles(matchBooks(books, query))).toEqual(["Ficciones", "La casa de los espíritus"]);
  });

  it("matches publishers accent-insensitively", () => {
    const query: SearchQuery = { kind: "position", field: "publisher", text: "EMECE" };
    expect(titles(matchBooks(books, query))).toEqual(["Cuentos completos"]);
  });

  it("matches ISBN exactly", () => {
    expect(titles(matchBooks(books, { kind: "position", field: "isbn", text: "9780000000004" }))).toEqual(["Ficciones"]);
    expect(matchBooks(books, { kind: "position", field: "isbn", text: "9780000000099" })).toEqual([]);
  });

  it("matches internal code exactly", () => {
    expect(titles(matchBooks(books, { kind: "position", field: "code", text: "3" }))).toEqual(["La casa de los espíritus"]);
    expect(matchBooks(books, { kind: "position", field: "code", text: "33" })).toEqual([]);
  });
});

describe("matchBooks — contains search", () => {
  it("finds a word anywhere in the field", () => {
    const query: SearchQuery = { kind: "contains", criteria: [{ field: "title", text: "casa" }] };
    expect(titles(matchBooks(books, query))).toEqual(["Casa tomada y otros cuentos", "La casa de los espíritus"]);
  });

  it("requires every combined criterion to match", () => {
    const query: SearchQuery = {
      kind: "contains",
      criteria: [
        { field: "title", text: "CUENTOS" },
        { field: "author", text: "BORGES" },
      ],
    };
    expect(titles(matchBooks(books, query))).toEqual(["Cuentos completos"]);
  });

  it("is accent insensitive", () => {
    const query: SearchQuery = { kind: "contains", criteria: [{ field: "title", text: "ESPIRITUS" }] };
    expect(titles(matchBooks(books, query))).toEqual(["La casa de los espíritus"]);
  });
});

describe("matchBooks — barcode", () => {
  it("searches by ISBN", () => {
    expect(titles(matchBooks(books, { kind: "barcode", isbn: "9780000000001" }))).toEqual(["Rayuela"]);
  });
});

describe("filterByAvailability", () => {
  it("keeps everything for all", () => {
    expect(filterByAvailability(books, "all")).toHaveLength(6);
  });

  it("keeps only immediate availability", () => {
    expect(filterByAvailability(books, "immediate").map((b) => b.code)).toEqual(["1", "4", "5", "6"]);
  });

  it("keeps immediate and on-order, dropping out of stock", () => {
    expect(filterByAvailability(books, "immediate_and_on_order").map((b) => b.code)).toEqual(["1", "2", "4", "5", "6"]);
  });
});
