import { describe, expect, it } from "vitest";
import type { Availability } from "@/modules/catalog/domain/book";
import { evaluateImport, parseImportCsv } from "./order-import";

describe("parseImportCsv", () => {
  it("reads ISBN from column A and quantity from column B without headers", () => {
    expect(parseImportCsv("9789503074060,4\n9788401352836;2\r\n")).toEqual([
      { row: 1, isbn: "9789503074060", quantity: "4" },
      { row: 2, isbn: "9788401352836", quantity: "2" },
    ]);
  });

  it("supports tabs, quotes and surrounding spaces", () => {
    expect(parseImportCsv(' "9789503074060" \t 3 ')).toEqual([{ row: 1, isbn: "9789503074060", quantity: "3" }]);
  });

  it("skips blank lines but keeps original row numbers", () => {
    expect(parseImportCsv("\n9789503074060,1\n\n9788401352836,2")).toEqual([
      { row: 2, isbn: "9789503074060", quantity: "1" },
      { row: 4, isbn: "9788401352836", quantity: "2" },
    ]);
  });

  it("keeps rows with a missing quantity so they can be reported", () => {
    expect(parseImportCsv("9789503074060")).toEqual([{ row: 1, isbn: "9789503074060", quantity: "" }]);
  });
});

describe("evaluateImport", () => {
  const catalog: Record<string, { isbn: string; availability: Availability }> = {
    "9780000000001": { isbn: "9780000000001", availability: "immediate" },
    "9780000000002": { isbn: "9780000000002", availability: "on_order" },
    "9780000000003": { isbn: "9780000000003", availability: "out_of_stock" },
  };
  const lookup = (isbn: string) => catalog[isbn];
  const rows = [
    { row: 1, isbn: "9780000000001", quantity: "2" },
    { row: 2, isbn: "9780000000002", quantity: "1" },
    { row: 3, isbn: "9780000000003", quantity: "5" },
  ];

  it("imports everything that exists with criterion all", () => {
    const result = evaluateImport(rows, "all", lookup);
    expect(result.accepted.map((a) => [a.book.isbn, a.quantity])).toEqual([
      ["9780000000001", 2],
      ["9780000000002", 1],
      ["9780000000003", 5],
    ]);
    expect(result.errors).toEqual([]);
  });

  it("only imports immediate stock with criterion in_stock", () => {
    const result = evaluateImport(rows, "in_stock", lookup);
    expect(result.accepted.map((a) => a.book.isbn)).toEqual(["9780000000001"]);
    expect(result.errors).toEqual([
      { row: 2, isbn: "9780000000002", reason: "not_in_stock" },
      { row: 3, isbn: "9780000000003", reason: "not_in_stock" },
    ]);
  });

  it("imports stock plus restock (on order) with criterion stock_and_restock", () => {
    const result = evaluateImport(rows, "stock_and_restock", lookup);
    expect(result.accepted.map((a) => a.book.isbn)).toEqual(["9780000000001", "9780000000002"]);
    expect(result.errors).toEqual([{ row: 3, isbn: "9780000000003", reason: "not_available" }]);
  });

  it("reports invalid ISBN, unknown ISBN and invalid quantities", () => {
    const result = evaluateImport(
      [
        { row: 1, isbn: "978-000", quantity: "1" },
        { row: 2, isbn: "9789999999999", quantity: "1" },
        { row: 3, isbn: "9780000000001", quantity: "0" },
        { row: 4, isbn: "9780000000001", quantity: "abc" },
        { row: 5, isbn: "9780000000001", quantity: "" },
        { row: 6, isbn: "9780000000001", quantity: "1.5" },
      ],
      "all",
      lookup,
    );
    expect(result.accepted).toEqual([]);
    expect(result.errors.map((e) => [e.row, e.reason])).toEqual([
      [1, "invalid_isbn"],
      [2, "not_found"],
      [3, "invalid_quantity"],
      [4, "invalid_quantity"],
      [5, "invalid_quantity"],
      [6, "invalid_quantity"],
    ]);
  });
});
