import { describe, expect, it } from "vitest";
import { priceBook } from "./pricing";
import { makeBook } from "./test-fixtures";

describe("priceBook", () => {
  it("applies the account discount to the list price", () => {
    const price = priceBook(makeBook({ listPrice: 1_890_000, promotion: null }), 10);
    expect(price).toEqual({ listPrice: 1_890_000, netPrice: 1_701_000, discountPercent: 10, promotionPercent: 0 });
  });

  it("chains the promotion on top of the account discount", () => {
    const price = priceBook(makeBook({ listPrice: 1_890_000, promotion: { name: "Promo invierno", percent: 5 } }), 10);
    expect(price.netPrice).toBe(1_615_950);
    expect(price.promotionPercent).toBe(5);
  });

  it("rounds to whole cents", () => {
    const price = priceBook(makeBook({ listPrice: 999, promotion: null }), 15);
    expect(price.netPrice).toBe(849);
  });

  it("returns the list price when there is no discount", () => {
    expect(priceBook(makeBook({ listPrice: 1000, promotion: null }), 0).netPrice).toBe(1000);
  });
});
