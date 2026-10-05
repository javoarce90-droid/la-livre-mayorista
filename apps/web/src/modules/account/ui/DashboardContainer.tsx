import { container, orderDeps } from "@/composition";
import { getCurrentOrder } from "@/modules/order/application/get-current-order";
import { orderTotals } from "@/modules/order/domain/order";
import type { PortalContext } from "@/portal-context";
import { getAccountOverview } from "../application/get-account-overview";
import { DashboardScreen } from "./DashboardScreen";

export async function DashboardContainer({ context }: { context: PortalContext }) {
  const now = new Date();
  const [overview, order] = await Promise.all([
    getAccountOverview(container().accounts, context.account.id, now),
    getCurrentOrder(orderDeps(), context.account.id),
  ]);
  return (
    <DashboardScreen
      overview={overview}
      order={order ? { ...orderTotals(order.lines), lineCount: order.lines.length } : null}
      now={now}
    />
  );
}
