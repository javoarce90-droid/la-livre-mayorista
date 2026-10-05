import type { Metadata } from "next";
import { PageHeader } from "@/modules/account/ui/PageHeader";
import { LibrosContainer } from "@/modules/catalog/ui/LibrosContainer";
import { requirePortalContext } from "@/portal-context";

export const metadata: Metadata = { title: "Libros" };

export default async function LibrosPage() {
  const { account } = await requirePortalContext();
  return (
    <>
      <PageHeader title="Libros" description="Buscá en el catálogo completo y agregá títulos a tu pedido." />
      <LibrosContainer suspended={account.flags.suspended} />
    </>
  );
}
