import { describe, expect, it } from "vitest";
import {
  addLine,
  diffOrder,
  hasChanges,
  isValidQuantity,
  lineNetUnitPrice,
  lineTotal,
  orderTotals,
  parseQuantity,
  removeLine,
  restoreLine,
  setLineQuantity,
  type OrderLine,
} from "./order";

function line(overrides: Partial<OrderLine> = {}): OrderLine {
  return {
    bookCode: "104882",
    isbn: "9789503074060",
    title: "Casa tomada y otros cuentos",
    availability: "immediate",
    originalDate: "2026-08-18",
    unitPrice: 1_890_000,
    quantity: 4,
    discountPercent: 10,
    promotionPercent: 0,
    observation: null,
    ...overrides,
  };
}

describe("line pricing", () => {
  it("applies account discount and promotion to the unit price", () => {
    expect(lineNetUnitPrice(line())).toBe(1_701_000);
    expect(lineNetUnitPrice(line({ promotionPercent: 5 }))).toBe(1_615_950);
  });

  it("multiplies the net unit price by the quantity", () => {
    expect(lineTotal(line())).toBe(6_804_000);
  });
});

describe("orderTotals", () => {
  it("sums every line into the total and only immediate lines into the available total", () => {
    const lines = [
      line({ bookCode: "a", quantity: 4 }),
      line({ bookCode: "b", availability: "out_of_stock", unitPrice: 2_450_000, quantity: 2 }),
      line({ bookCode: "c", availability: "on_order", unitPrice: 2_740_000, quantity: 3 }),
    ];
    expect(orderTotals(lines)).toEqual({
      total: 6_804_000 + 4_410_000 + 7_398_000,
      available: 6_804_000,
      units: 9,
    });
  });

  it("is zero for an empty order", () => {
    expect(orderTotals([])).toEqual({ total: 0, available: 0, units: 0 });
  });
});

describe("addLine", () => {
  it("appends a new book", () => {
    const result = addLine([line({ bookCode: "a" })], line({ bookCode: "b", quantity: 2 }));
    expect(result.ok && result.value.map((l) => [l.bookCode, l.quantity])).toEqual([
      ["a", 4],
      ["b", 2],
    ]);
  });

  it("merges the quantity when the book is already in the order", () => {
    const result = addLine([line({ bookCode: "a", quantity: 4 })], line({ bookCode: "a", quantity: 3 }));
    expect(result.ok && result.value.map((l) => l.quantity)).toEqual([7]);
  });

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid quantity %s", (quantity) => {
    expect(addLine([], line({ quantity }))).toEqual({ ok: false, error: "invalid_quantity" });
  });

  it("does not mutate the original lines", () => {
    const original = [line({ bookCode: "a", quantity: 1 })];
    addLine(original, line({ bookCode: "a", quantity: 1 }));
    expect(original[0].quantity).toBe(1);
  });
});

describe("removeLine", () => {
  it("removes the line for the book", () => {
    const lines = [line({ bookCode: "a" }), line({ bookCode: "b" })];
    expect(removeLine(lines, "a").map((l) => l.bookCode)).toEqual(["b"]);
  });

  it("is a no-op for unknown books", () => {
    const lines = [line({ bookCode: "a" })];
    expect(removeLine(lines, "zzz")).toEqual(lines);
  });
});

describe("parseQuantity", () => {
  // Postel: accept what people type or paste; validity (>= 1, ceilings) is checked by the caller.
  it.each([
    ["3", 3],
    ["  12 ", 12],
    ["1.000", 1000],
    ["1 000", 1000],
    ["+4", 4],
    ["0", 0],
    ["-2", -2],
  ])("parses %j as %d", (text, expected) => {
    expect(parseQuantity(text)).toBe(expected);
  });

  it.each(["", "  ", "2,5", "2.5", "1.00", "abc", "2e3", "3 libros", "99999999999999999999"])("rejects %j", (text) => {
    expect(parseQuantity(text)).toBeNull();
  });
});

describe("isValidQuantity", () => {
  it("accepts whole numbers from 1 up", () => {
    expect(isValidQuantity(1)).toBe(true);
    expect(isValidQuantity(0)).toBe(false);
    expect(isValidQuantity(1.5)).toBe(false);
  });
});

describe("setLineQuantity", () => {
  const lines = [line({ bookCode: "a", quantity: 3 })];

  it("lowers the quantity", () => {
    const result = setLineQuantity(lines, "a", 2, 5);
    expect(result.ok && result.value[0].quantity).toBe(2);
  });

  it("raises it back up to the ceiling (e.g. after lowering by mistake)", () => {
    const result = setLineQuantity(lines, "a", 5, 5);
    expect(result.ok && result.value[0].quantity).toBe(5);
  });

  it("rejects quantities above the ceiling", () => {
    expect(setLineQuantity(lines, "a", 6, 5)).toEqual({ ok: false, error: "above_maximum" });
  });

  it("rejects quantities below 1", () => {
    expect(setLineQuantity(lines, "a", 0, 5)).toEqual({ ok: false, error: "below_minimum" });
  });

  it("rejects non-integer quantities", () => {
    expect(setLineQuantity(lines, "a", Number.NaN, 5)).toEqual({ ok: false, error: "not_integer" });
    expect(setLineQuantity(lines, "a", 2.5, 5)).toEqual({ ok: false, error: "not_integer" });
  });

  it("rejects unknown books", () => {
    expect(setLineQuantity(lines, "x", 1, 5)).toEqual({ ok: false, error: "not_found" });
  });

  it("does not mutate the original lines", () => {
    setLineQuantity(lines, "a", 1, 5);
    expect(lines[0].quantity).toBe(3);
  });
});

describe("restoreLine", () => {
  it("puts a removed line back where it was", () => {
    const lines = [line({ bookCode: "a" }), line({ bookCode: "b" }), line({ bookCode: "c" })];
    const removed = removeLine(lines, "b");
    expect(restoreLine(removed, lines[1], 1).map((l) => l.bookCode)).toEqual(["a", "b", "c"]);
  });

  it("clamps the position and never duplicates", () => {
    const lines = [line({ bookCode: "a" })];
    expect(restoreLine(lines, line({ bookCode: "b" }), 99).map((l) => l.bookCode)).toEqual(["a", "b"]);
    expect(restoreLine(lines, line({ bookCode: "a" }), 0)).toHaveLength(1);
  });
});

describe("diffOrder", () => {
  it("reports added, removed and changed lines", () => {
    const before = [line({ bookCode: "a", quantity: 4 }), line({ bookCode: "b", quantity: 1 })];
    const after = [line({ bookCode: "a", quantity: 2 }), line({ bookCode: "c", quantity: 1 })];
    const diff = diffOrder(before, after);
    expect(diff.added.map((l) => l.bookCode)).toEqual(["c"]);
    expect(diff.removed.map((l) => l.bookCode)).toEqual(["b"]);
    expect(diff.changed.map(({ line: l, from, to }) => [l.bookCode, from, to])).toEqual([["a", 4, 2]]);
    expect(hasChanges(diff)).toBe(true);
  });

  it("is empty when nothing changed", () => {
    const lines = [line({ bookCode: "a" })];
    expect(hasChanges(diffOrder(lines, [...lines]))).toBe(false);
  });
});

