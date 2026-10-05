import { container, orderDeps } from "@/composition";
import type { BookView } from "@/modules/catalog/application/book-view";
import { getBook } from "@/modules/catalog/application/get-book";
import type { PortalContext } from "@/portal-context";
import { getCurrentOrder } from "../application/get-current-order";
import { PedidoContainer } from "./PedidoContainer";

/** Server container: loads the order and its books, hands plain data to the client container. */
export async function PedidoPageContainer({ context: { account } }: { context: PortalContext }) {
  const order = await getCurrentOrder(orderDeps(), account.id);
  const books = await Promise.all(
    (order?.lines ?? []).map((line) => getBook(container().catalog, { code: line.bookCode, discountPercent: account.discountPercent })),
  );
  return (
    <PedidoContainer
      key={order ? order.lines.map((line) => `${line.bookCode}:${line.quantity}`).join("|") : "empty"}
      account={{
        bookstoreName: account.bookstoreName,
        branch: account.branch,
        deposit: account.deposit,
        rubro: account.rubro,
        email: account.email,
        zone: account.zone,
        discountPercent: account.discountPercent,
        suspended: account.flags.suspended,
        orderLocked: account.flags.orderLocked,
      }}
      order={order ? { createdAt: order.createdAt, lines: order.lines } : null}
      books={Object.fromEntries(books.filter((book): book is BookView => book !== null).map((book) => [book.code, book]))}
    />
  );
}
