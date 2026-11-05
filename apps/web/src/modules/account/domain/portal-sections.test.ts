import { describe, expect, it } from "vitest";
import { HOME_PATH, PORTAL_SECTIONS } from "./portal-sections";

describe("PORTAL_SECTIONS", () => {
  it("lists only the built sections in menu order", () => {
    expect(PORTAL_SECTIONS.map((s) => s.label)).toEqual(["Dashboard", "Libros", "Pedido"]);
  });

  it("uses the catalog as the portal home", () => {
    expect(HOME_PATH).toBe("/libros");
    expect(PORTAL_SECTIONS.find((s) => s.key === "libros")?.href).toBe(HOME_PATH);
  });
});
