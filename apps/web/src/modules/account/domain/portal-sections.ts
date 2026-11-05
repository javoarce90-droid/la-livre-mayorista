export type PortalSectionKey = "dashboard" | "libros" | "pedido";

export interface PortalSection {
  key: PortalSectionKey;
  label: string;
  href: `/${string}`;
}

/** Where signed-in users land: the catalog is the portal's default screen. */
export const HOME_PATH = "/libros";

export const PORTAL_SECTIONS: readonly PortalSection[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "libros", label: "Libros", href: HOME_PATH },
  { key: "pedido", label: "Pedido", href: "/pedido" },
];
