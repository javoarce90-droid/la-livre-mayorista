import { describe, expect, it } from "vitest";
import {
  addLine,
  canDecreaseQuantity,
  decreaseQuantity,
  lineNetUnitPrice,
  lineTotal,
  orderTotals,
  removeLine,
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

describe("decreaseQuantity", () => {
  const lines = [line({ bookCode: "a", quantity: 5 })];

  it("lowers the quantity", () => {
    const result = decreaseQuantity(lines, "a", 2);
    expect(result.ok && result.value[0].quantity).toBe(2);
  });

  it("allows going down to 1", () => {
    const result = decreaseQuantity(lines, "a", 1);
    expect(result.ok && result.value[0].quantity).toBe(1);
  });

  it("rejects equal or higher quantities", () => {
    expect(decreaseQuantity(lines, "a", 5)).toEqual({ ok: false, error: "not_lower" });
    expect(decreaseQuantity(lines, "a", 9)).toEqual({ ok: false, error: "not_lower" });
  });

  it("rejects quantities below 1", () => {
    expect(decreaseQuantity(lines, "a", 0)).toEqual({ ok: false, error: "below_minimum" });
  });

  it("rejects non-integer quantities", () => {
    expect(decreaseQuantity(lines, "a", 2.5)).toEqual({ ok: false, error: "not_integer" });
  });

  it("rejects unknown books", () => {
    expect(decreaseQuantity(lines, "x", 1)).toEqual({ ok: false, error: "not_found" });
  });
});

describe("canDecreaseQuantity", () => {
  it("is only possible when the quantity is above 1", () => {
    expect(canDecreaseQuantity(line({ quantity: 2 }))).toBe(true);
    expect(canDecreaseQuantity(line({ quantity: 1 }))).toBe(false);
  });
});
