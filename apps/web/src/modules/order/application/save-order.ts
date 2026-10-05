import { isValidQuantity, type OrderLine } from "../domain/order";
import { buildOrderLine, type OrderAccount, type OrderDeps } from "./order-context";

export type SaveOrderError = "order_locked" | "book_not_found" | "invalid_quantity" | "empty_order";

export type SaveOrderResult = { status: "saved" } | { status: "dispatched" } | { status: "error"; error: SaveOrderError };

export interface SaveOrderLineInput {
  bookCode: string;
  quantity: number;
}

/**
 * Persists the edited order. Prices are re-read from the catalog: the client only
 * sends codes and quantities. Stock is reserved only once this runs.
 */
export async function saveOrder(
  deps: OrderDeps,
  input: { account: OrderAccount; lines: readonly SaveOrderLineInput[]; dispatch: boolean },
): Promise<SaveOrderResult> {
  const { account, dispatch } = input;
  if (account.flags.orderLocked) return { status: "error", error: "order_locked" };
  if (input.lines.some((line) => !isValidQuantity(line.quantity))) return { status: "error", error: "invalid_quantity" };
  if (dispatch && input.lines.length === 0) return { status: "error", error: "empty_order" };

  const current = await deps.orders.getCurrent(account.id);
  const previousDates = new Map(current?.lines.map((line) => [line.bookCode, line.originalDate]));

  const lines: OrderLine[] = [];
  for (const { bookCode, quantity } of input.lines) {
    const book = await deps.catalog.findByCode(bookCode);
    if (!book) return { status: "error", error: "book_not_found" };
    lines.push(buildOrderLine(book, account.discountPercent, quantity, previousDates.get(bookCode) ?? deps.today));
  }

  if (dispatch) {
    await deps.orders.close(account.id);
    return { status: "dispatched" };
  }
  await deps.orders.save(account.id, {
    id: current?.id ?? `ord-${account.id}-${deps.today}`,
    createdAt: current?.createdAt ?? deps.today,
    lines,
  });
  return { status: "saved" };
}
