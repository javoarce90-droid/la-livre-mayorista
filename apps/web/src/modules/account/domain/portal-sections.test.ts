import { describe, expect, it } from "vitest";
import { visiblePortalSections } from "./portal-sections";

const flags = { hasConsignment: true, hasPromotions: true, suspended: false, orderLocked: false };

describe("visiblePortalSections", () => {
  it("lists every section in menu order", () => {
    expect(visiblePortalSections(flags).map((s) => s.label)).toEqual([
      "Dashboard",
      "Libros",
      "Pedido",
      "Ingresos Recientes",
      "Novedades",
      "Promociones",
      "Catálogos",
      "Estadísticas",
      "Recomendador",
      "Mensajería",
    ]);
  });

  it("hides Promociones when the account has no promotions", () => {
    expect(visiblePortalSections({ ...flags, hasPromotions: false }).map((s) => s.key)).not.toContain("promociones");
  });

  it("marks the recommender with the IA badge", () => {
    expect(visiblePortalSections(flags).find((s) => s.key === "recomendador")?.badge).toBe("IA");
  });
});
