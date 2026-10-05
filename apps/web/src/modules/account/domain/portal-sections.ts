import type { AccountFlags } from "./account";

export type PortalSectionKey =
  | "dashboard"
  | "libros"
  | "pedido"
  | "ingresos-recientes"
  | "novedades"
  | "promociones"
  | "catalogos"
  | "estadisticas"
  | "recomendador"
  | "mensajeria";

export interface PortalSection {
  key: PortalSectionKey;
  label: string;
  href: `/${string}`;
  /** Sections not built yet render the "Próximamente" placeholder. */
  available: boolean;
  badge?: string;
}

export const PORTAL_SECTIONS: readonly PortalSection[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", available: true },
  { key: "libros", label: "Libros", href: "/libros", available: true },
  { key: "pedido", label: "Pedido", href: "/pedido", available: true },
  { key: "ingresos-recientes", label: "Ingresos Recientes", href: "/ingresos-recientes", available: false },
  { key: "novedades", label: "Novedades", href: "/novedades", available: false },
  { key: "promociones", label: "Promociones", href: "/promociones", available: false },
  { key: "catalogos", label: "Catálogos", href: "/catalogos", available: false },
  { key: "estadisticas", label: "Estadísticas", href: "/estadisticas", available: false },
  { key: "recomendador", label: "Recomendador", href: "/recomendador", available: false, badge: "IA" },
  { key: "mensajeria", label: "Mensajería", href: "/mensajeria", available: false },
];

export function visiblePortalSections(flags: AccountFlags): PortalSection[] {
  return PORTAL_SECTIONS.filter((section) => section.key !== "promociones" || flags.hasPromotions);
}

export function findComingSoonSection(slug: string, flags: AccountFlags): PortalSection | undefined {
  return visiblePortalSections(flags).find((section) => !section.available && section.key === slug);
}
