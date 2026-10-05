import { addLine, isValidQuantity } from "../domain/order";
import { buildOrderLine, type OrderAccount, type OrderDeps } from "./order-context";

export type AddBookError = "account_suspended" | "order_locked" | "book_not_found" | "invalid_quantity";

export type AddBookResult =
  | { status: "added" }
  /** "Se requiere intervención": the book has no immediate stock. */
  | { status: "needs_confirmation" }
  | { status: "error"; error: AddBookError };

export async function addBookToOrder(
  deps: OrderDeps,
  input: { account: OrderAccount; bookCode: string; quantity: number; confirmUnavailable: boolean },
): Promise<AddBookResult> {
  const { account, bookCode, quantity, confirmUnavailable } = input;
  if (account.flags.suspended) return { status: "error", error: "account_suspended" };
  if (account.flags.orderLocked) return { status: "error", error: "order_locked" };
  if (!isValidQuantity(quantity)) return { status: "error", error: "invalid_quantity" };

  const book = await deps.catalog.findByCode(bookCode);
  if (!book) return { status: "error", error: "book_not_found" };
  if (book.availability !== "immediate" && !confirmUnavailable) return { status: "needs_confirmation" };

  const current = (await deps.orders.getCurrent(account.id)) ?? {
    id: `ord-${account.id}-${deps.today}`,
    createdAt: deps.today,
    lines: [],
  };
  const lines = addLine(current.lines, buildOrderLine(book, account.discountPercent, quantity, deps.today));
  if (!lines.ok) return { status: "error", error: lines.error };
  await deps.orders.save(account.id, { ...current, lines: lines.value });
  return { status: "added" };
}
