import type { Metadata } from "next";
import { PageHeader } from "@/modules/account/ui/PageHeader";
import { PedidoPageContainer } from "@/modules/order/ui/PedidoPageContainer";
import { requirePortalContext } from "@/portal-context";

export const metadata: Metadata = { title: "Pedido" };

export default async function PedidoPage() {
  return (
    <>
      <PageHeader title="Pedido" description="Revisá tu pedido en curso: ajustá cantidades, quitá títulos y despachalo cuando esté listo." />
      <PedidoPageContainer context={await requirePortalContext()} />
    </>
  );
}
