import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("keeps same-site relative paths, with query", () => {
    expect(safeRedirectPath("/pedido?x=1", "/libros")).toBe("/pedido?x=1");
    expect(safeRedirectPath("/cuenta/clave", "/libros")).toBe("/cuenta/clave");
  });

  it.each([
    null,
    undefined,
    "",
    "pedido",
    "//evil.com",
    "/\\evil.com",
    "https://evil.com",
    "/\nfoo",
    " /pedido",
  ])("falls back for %o", (value) => {
    expect(safeRedirectPath(value, "/libros")).toBe("/libros");
  });
});
