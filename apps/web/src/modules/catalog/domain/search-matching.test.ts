import { describe, expect, it } from "vitest";
import type { Book } from "./book";
import { matchBooks, sortBooksByTitle } from "./search-matching";
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
const keywords = (text: string): SearchQuery => ({ kind: "keywords", words: text.split(" ") });

describe("matchBooks — keywords (plain text)", () => {
  it("finds a title typed directly, without any prefix", () => {
    expect(titles(matchBooks(books, keywords("rayuela")))).toEqual(["Rayuela"]);
  });

  it("is case and accent insensitive", () => {
    expect(titles(matchBooks(books, keywords("CIEN ANOS")))).toEqual(["Cien años de soledad"]);
  });

  it("requires every word, in any field and any order", () => {
    expect(titles(matchBooks(books, keywords("borges cuentos")))).toEqual(["Cuentos completos"]);
    expect(titles(matchBooks(books, keywords("julio cortazar")))).toEqual(["Casa tomada y otros cuentos", "Rayuela"]);
  });

  it("ranks titles that start with the text first, then titles containing it, then other fields", () => {
    expect(titles(matchBooks(books, keywords("casa")))).toEqual(["Casa tomada y otros cuentos", "La casa de los espíritus"]);
    expect(titles(matchBooks(books, keywords("cuentos")))).toEqual(["Cuentos completos", "Casa tomada y otros cuentos"]);
  });

  it("matches ISBN fragments typed with dashes and internal codes", () => {
    expect(titles(matchBooks(books, keywords("978-0000000004")))).toEqual(["Ficciones"]);
  });

  it("returns nothing when a word is missing", () => {
    expect(matchBooks(books, keywords("rayuela borges"))).toEqual([]);
  });
});

describe("matchBooks — legacy position shortcut", () => {
  it("positions alphabetically by title starting at the text", () => {
    const query: SearchQuery = { kind: "position", field: "title", text: "L" };
    expect(titles(matchBooks(books, query))).toEqual(["La casa de los espíritus", "Rayuela"]);
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

  it("matches ISBN and internal code exactly", () => {
    expect(titles(matchBooks(books, { kind: "position", field: "isbn", text: "9780000000004" }))).toEqual(["Ficciones"]);
    expect(matchBooks(books, { kind: "position", field: "code", text: "33" })).toEqual([]);
  });
});

describe("matchBooks — legacy + shortcut", () => {
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
});

describe("matchBooks — ISBN", () => {
  it("matches the exact ISBN", () => {
    expect(titles(matchBooks(books, { kind: "isbn", isbn: "9780000000001" }))).toEqual(["Rayuela"]);
  });
});

describe("sortBooksByTitle", () => {
  it("orders accent-insensitively by title", () => {
    expect(titles(sortBooksByTitle(books))).toEqual([
      "Casa tomada y otros cuentos",
      "Cien años de soledad",
      "Cuentos completos",
      "Ficciones",
      "La casa de los espíritus",
      "Rayuela",
    ]);
  });
});
