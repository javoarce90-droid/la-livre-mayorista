import type { Metadata } from "next";
import { container } from "@/composition";
import { PageHeader } from "@/modules/account/ui/PageHeader";
import { getCatalogFacets } from "@/modules/catalog/application/get-catalog-facets";
import { LibrosContainer } from "@/modules/catalog/ui/LibrosContainer";
import { requirePortalContext } from "@/portal-context";

export const metadata: Metadata = { title: "Libros" };

export default async function LibrosPage() {
  const { account } = await requirePortalContext();
  const facets = await getCatalogFacets(container().catalog);
  return (
    <>
      <PageHeader title="Libros" description="Buscá en el catálogo completo y agregá títulos a tu pedido." />
      <LibrosContainer suspended={account.flags.suspended} facets={facets} />
    </>
  );
}
