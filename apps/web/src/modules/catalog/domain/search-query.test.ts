import { describe, expect, it } from "vitest";
import { criterionLabel, normalizeIsbn, parseLegacyShortcut, parseSearchQuery } from "./search-query";

describe("parseSearchQuery — plain text (default)", () => {
  it.each([
    ["Rayuela", ["Rayuela"]],
    ["cien años", ["cien", "años"]],
    ["  borges   aleph ", ["borges", "aleph"]],
    ["Antología poética", ["Antología", "poética"]],
    ["TCASA", ["TCASA"]],
  ])("%s is a keyword search", (input, words) => {
    expect(parseSearchQuery(input)).toEqual({ ok: true, value: { kind: "keywords", words } });
  });

  it("rejects empty input", () => {
    expect(parseSearchQuery("   ")).toEqual({ ok: false, error: "empty" });
  });
});

describe("parseSearchQuery — ISBN", () => {
  it.each(["9789503074060", "978-950-307-406-0", "978 950 307 406 0"])("detects a typed ISBN: %s", (input) => {
    expect(parseSearchQuery(input)).toEqual({ ok: true, value: { kind: "isbn", isbn: "9789503074060" } });
  });

  it("treats shorter numbers as keywords (e.g. an internal code)", () => {
    expect(parseSearchQuery("104882")).toEqual({ ok: true, value: { kind: "keywords", words: ["104882"] } });
  });

  it.each(["*9789503074060*", "(9789503074060)"])("treats scanner input %s as an ISBN", (input) => {
    expect(parseSearchQuery(input)).toEqual({ ok: true, value: { kind: "isbn", isbn: "9789503074060" } });
  });

  it("rejects scanner input that does not contain 13 digits", () => {
    expect(parseSearchQuery("*12345*")).toEqual({ ok: false, error: "invalid_isbn" });
  });
});

describe("parseSearchQuery — legacy + shortcut", () => {
  it("parses a single + criterion", () => {
    expect(parseSearchQuery("+TCASA")).toEqual({
      ok: true,
      value: { kind: "contains", criteria: [{ field: "title", text: "CASA" }] },
    });
  });

  it("parses combined criteria with multi-word text", () => {
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

  it("accepts an ISBN with dashes inside +I", () => {
    expect(parseSearchQuery("+I978-950-307-406-0")).toEqual({
      ok: true,
      value: { kind: "contains", criteria: [{ field: "isbn", text: "9789503074060" }] },
    });
  });

  it("propagates errors from any criterion", () => {
    expect(parseSearchQuery("+TCASA +Q")).toEqual({ ok: false, error: "unknown_field" });
    expect(parseSearchQuery("+TCASA +A")).toEqual({ ok: false, error: "missing_text" });
    expect(parseSearchQuery("+T CASA")).toEqual({ ok: false, error: "space_after_letter" });
    expect(parseSearchQuery("+I123")).toEqual({ ok: false, error: "invalid_isbn" });
    expect(parseSearchQuery("+")).toEqual({ ok: false, error: "missing_text" });
  });

  it("flags combined shortcuts whose first criterion lacks +", () => {
    expect(parseSearchQuery("TCUENTOS +ABORGES")).toEqual({ ok: false, error: "missing_plus" });
  });
});

describe("parseLegacyShortcut", () => {
  it.each([
    ["TCASA", "title", "CASA"],
    ["aborges", "author", "borges"],
    ["EALFAGUARA", "publisher", "ALFAGUARA"],
    ["I9789503074060", "isbn", "9789503074060"],
    ["C104882", "code", "104882"],
  ])("reads %s as %s", (input, field, text) => {
    expect(parseLegacyShortcut(input)).toEqual({ kind: "position", field, text });
  });

  it.each(["", "T", "XCASA", "T CASA", "+TCASA", "*978"])("returns null for %j", (input) => {
    expect(parseLegacyShortcut(input)).toBeNull();
  });
});

describe("normalizeIsbn", () => {
  it("strips dashes and spaces", () => {
    expect(normalizeIsbn("978-950 307-406-0")).toBe("9789503074060");
  });

  it("returns null for anything that is not 13 digits", () => {
    expect(normalizeIsbn("978950307406")).toBeNull();
    expect(normalizeIsbn("97895030740AB")).toBeNull();
  });
});

describe("criterionLabel", () => {
  it.each([
    ["+ABORGES", "Autor"],
    ["+tcasa", "Título"],
    ["978-950-307-406-0", "ISBN"],
    ["*978", "Código de barras"],
    ["(978", "Código de barras"],
  ])("%s → %s", (input, label) => {
    expect(criterionLabel(input)).toBe(label);
  });

  it("stays hidden for plain text, so a title starting with A is not labelled Autor", () => {
    expect(criterionLabel("Antología")).toBeNull();
    expect(criterionLabel("TCASA")).toBeNull();
    expect(criterionLabel("")).toBeNull();
    expect(criterionLabel("+")).toBeNull();
  });
});
