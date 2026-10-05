import { describe, expect, it } from "vitest";
import { canAddToOrder } from "./account";

const flags = { hasConsignment: false, hasPromotions: false, suspended: false, orderLocked: false };

describe("canAddToOrder", () => {
  it("allows active accounts", () => {
    expect(canAddToOrder(flags)).toBe(true);
  });

  it("blocks suspended accounts", () => {
    expect(canAddToOrder({ ...flags, suspended: true })).toBe(false);
  });
});
