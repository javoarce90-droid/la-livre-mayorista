import { describe, expect, it } from "vitest";
import type { Book } from "./book";
import { activeFilterCount, applyFilters, filterByAvailability, NO_FILTERS, sanitizeFilters } from "./search-filters";
import { makeBook } from "./test-fixtures";

const books: Book[] = [
  makeBook({ code: "1", author: "Cortázar, Julio", publisher: "Alfaguara", subject: "Narrativa", availability: "immediate" }),
  makeBook({ code: "2", author: "Cortázar, Julio", publisher: "Alfaguara", subject: "Cuentos", availability: "on_order", promotion: { name: "Feria", percent: 5 } }),
  makeBook({ code: "3", author: "Allende, Isabel", publisher: "Debolsillo", subject: "Narrativa", availability: "out_of_stock" }),
  makeBook({ code: "4", author: "Borges, Jorge Luis", publisher: "Debolsillo", subject: "Cuentos", availability: "immediate" }),
  makeBook({ code: "5", author: "Borges, Jorge Luis", publisher: "Emecé", subject: "Cuentos", availability: "immediate", promotion: { name: "Feria", percent: 5 } }),
];

const codes = (result: Book[]) => result.map((b) => b.code);

describe("applyFilters", () => {
  it("keeps everything with no filters", () => {
    expect(applyFilters(books, NO_FILTERS)).toHaveLength(5);
  });

  it("filters by author words in any order, ignoring accents", () => {
    expect(codes(applyFilters(books, { ...NO_FILTERS, author: "julio cortazar" }))).toEqual(["1", "2"]);
  });

  it("filters by publisher fragment", () => {
    expect(codes(applyFilters(books, { ...NO_FILTERS, publisher: "emece" }))).toEqual(["5"]);
  });

  it("filters by exact subject", () => {
    expect(codes(applyFilters(books, { ...NO_FILTERS, subject: "cuentos" }))).toEqual(["2", "4", "5"]);
  });

  it("filters by promotion", () => {
    expect(codes(applyFilters(books, { ...NO_FILTERS, promotionOnly: true }))).toEqual(["2", "5"]);
  });

  it("combines every filter (AND)", () => {
    const filters = { ...NO_FILTERS, author: "borges", subject: "Cuentos", availability: "immediate" as const, promotionOnly: true };
    expect(codes(applyFilters(books, filters))).toEqual(["5"]);
  });
});

describe("filterByAvailability", () => {
  it("keeps only immediate availability", () => {
    expect(codes(filterByAvailability(books, "immediate"))).toEqual(["1", "4", "5"]);
  });

  it("keeps immediate and on-order, dropping out of stock", () => {
    expect(codes(filterByAvailability(books, "immediate_and_on_order"))).toEqual(["1", "2", "4", "5"]);
  });
});

describe("activeFilterCount", () => {
  it("counts only the filters that restrict results", () => {
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, author: "  " })).toBe(0);
    expect(activeFilterCount({ ...NO_FILTERS, author: "borges", availability: "immediate", promotionOnly: true })).toBe(3);
  });
});

describe("sanitizeFilters", () => {
  it("trims text, rejects unknown availability and non-boolean flags", () => {
    expect(
      sanitizeFilters({ author: "  borges ", publisher: 42, subject: "Cuentos", availability: "bogus", promotionOnly: "yes" }),
    ).toEqual({ author: "borges", publisher: "", subject: "Cuentos", availability: "all", promotionOnly: false });
  });

  it("defaults to no filters", () => {
    expect(sanitizeFilters(undefined)).toEqual(NO_FILTERS);
  });

  it("caps text length", () => {
    expect(sanitizeFilters({ author: "x".repeat(500) }).author).toHaveLength(100);
  });
});
