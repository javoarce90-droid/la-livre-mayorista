import { describe, expect, it } from "vitest";
import { normalizeText } from "./text";

describe("normalizeText", () => {
  it("uppercases, strips accents and collapses whitespace", () => {
    expect(normalizeText("  García   Márquez ")).toBe("GARCIA MARQUEZ");
  });

  it("folds ñ to N so search is accent-insensitive", () => {
    expect(normalizeText("Año")).toBe("ANO");
  });
});
