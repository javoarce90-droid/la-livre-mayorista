import type { CatalogFacets, CatalogRepository } from "./catalog-repository";

/** Publishers and subjects offered as suggestions in the Libros filter panel. */
export function getCatalogFacets(catalog: CatalogRepository): Promise<CatalogFacets> {
  return catalog.facets();
}
