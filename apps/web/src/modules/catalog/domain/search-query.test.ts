import { describe, expect, it } from "vitest";
import { criterionLabel, parseSearchQuery } from "./search-query";

describe("parseSearchQuery — field letter", () => {
  it.each([
    ["TCASA", "title", "CASA"],
    ["ABORGES", "author", "BORGES"],
    ["EALFAGUARA", "publisher", "ALFAGUARA"],
    ["I9789503074060", "isbn", "9789503074060"],
    ["C104882", "code", "104882"],
  ])("%s selects the %s field", (input, field, text) => {
    expect(parseSearchQuery(input)).toEqual({ ok: true, value: { kind: "position", field, text } });
  });

  it("accepts lowercase letters", () => {
    expect(parseSearchQuery("tcasa")).toEqual({
      ok: true,
      value: { kind: "position", field: "title", text: "casa" },
    });
  });

  it("keeps inner spaces of the text", () => {
    expect(parseSearchQuery("TCIEN AÑOS")).toEqual({
      ok: true,
      value: { kind: "position", field: "title", text: "CIEN AÑOS" },
    });
  });

  it("trims surrounding whitespace", () => {
    expect(parseSearchQuery("   TCASA  ")).toEqual({
      ok: true,
      value: { kind: "position", field: "title", text: "CASA" },
    });
  });
});

describe("parseSearchQuery — errors", () => {
  it("rejects empty input", () => {
    expect(parseSearchQuery("   ")).toEqual({ ok: false, error: "empty" });
  });

  it("rejects an unknown letter", () => {
    expect(parseSearchQuery("XCASA")).toEqual({ ok: false, error: "unknown_field" });
  });

  it("rejects a letter without text", () => {
    expect(parseSearchQuery("T")).toEqual({ ok: false, error: "missing_text" });
  });

  it("rejects a space between the letter and the text", () => {
    expect(parseSearchQuery("T CASA")).toEqual({ ok: false, error: "space_after_letter" });
  });

  it.each(["I978950307406", "I97895030740601", "I978-950-307-406-0", "I97895030740AB"])(
    "rejects an ISBN that is not 13 digits: %s",
    (input) => {
      expect(parseSearchQuery(input)).toEqual({ ok: false, error: "invalid_isbn" });
    },
  );

  it("rejects combined criteria when the first one lacks +", () => {
    expect(parseSearchQuery("TCUENTOS +ABORGES")).toEqual({ ok: false, error: "missing_plus" });
  });
});

describe("parseSearchQuery — contains (+)", () => {
  it("parses a single + criterion", () => {
    expect(parseSearchQuery("+TCASA")).toEqual({
      ok: true,
      value: { kind: "contains", criteria: [{ field: "title", text: "CASA" }] },
    });
  });

  it("parses combined criteria separated by spaces", () => {
    expect(parseSearchQuery("+TCUENTOS +ABORGES")).toEqual({
      ok: true,
      value: {
        kind: "contains",
        criteria: [
          { field: "title", text: "CUENTOS" },
          { field: "author", text: "BORGES" },
        ],
      },
    });
  });

  it("allows multi-word text inside a + criterion", () => {
    expect(parseSearchQuery("+TCIEN AÑOS   +AGARCIA")).toEqual({
      ok: true,
      value: {
        kind: "contains",
        criteria: [
          { field: "title", text: "CIEN AÑOS" },
          { field: "author", text: "GARCIA" },
        ],
      },
    });
  });

  it("propagates errors from any criterion", () => {
    expect(parseSearchQuery("+TCASA +Q")).toEqual({ ok: false, error: "unknown_field" });
    expect(parseSearchQuery("+TCASA +A")).toEqual({ ok: false, error: "missing_text" });
    expect(parseSearchQuery("+")).toEqual({ ok: false, error: "missing_text" });
  });
});

describe("parseSearchQuery — barcode scan", () => {
  it("treats text starting with * as a barcode and searches by ISBN", () => {
    expect(parseSearchQuery("*9789503074060*")).toEqual({
      ok: true,
      value: { kind: "barcode", isbn: "9789503074060" },
    });
  });

  it("treats text starting with ( as a barcode", () => {
    expect(parseSearchQuery("(9789503074060)")).toEqual({
      ok: true,
      value: { kind: "barcode", isbn: "9789503074060" },
    });
  });

  it("rejects a barcode that does not contain 13 digits", () => {
    expect(parseSearchQuery("*12345*")).toEqual({ ok: false, error: "invalid_isbn" });
  });
});

describe("criterionLabel", () => {
  it.each([
    ["TCASA", "Título"],
    ["a", "Autor"],
    ["Ealfa", "Editorial"],
    ["I978", "ISBN"],
    ["C1", "Código"],
    ["+ABORGES", "Autor"],
    ["*978", "Código de barras"],
    ["(978", "Código de barras"],
  ])("%s → %s", (input, label) => {
    expect(criterionLabel(input)).toBe(label);
  });

  it("returns null for empty or unknown input", () => {
    expect(criterionLabel("")).toBeNull();
    expect(criterionLabel("X")).toBeNull();
    expect(criterionLabel("+")).toBeNull();
  });
});
