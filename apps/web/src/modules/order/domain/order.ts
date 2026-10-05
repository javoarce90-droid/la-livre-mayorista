import type { Availability } from "@/modules/catalog/domain/book";
import { applyDiscounts } from "@/modules/catalog/domain/pricing";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export interface OrderLine {
  /** Internal code, shown as SKU. */
  bookCode: string;
  isbn: string;
  title: string;
  availability: Availability;
  /** ISO date the line was first added. */
  originalDate: string;
  /** List price (PVP) in cents. */
  unitPrice: number;
  quantity: number;
  discountPercent: number;
  promotionPercent: number;
  observation: string | null;
}

export interface Order {
  id: string;
  /** ISO date the order was opened. */
  createdAt: string;
  lines: OrderLine[];
}

export interface OrderTotals {
  /** Everything loaded, available or not. */
  total: number;
  /** Only immediately available lines (what ships today). */
  available: number;
  units: number;
}

export type AddLineError = "invalid_quantity";
export type DecreaseQuantityError = "not_found" | "not_integer" | "below_minimum" | "not_lower";

export function isValidQuantity(quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1;
}

export function lineNetUnitPrice(line: OrderLine): number {
  return applyDiscounts(line.unitPrice, line.discountPercent, line.promotionPercent);
}

export function lineTotal(line: OrderLine): number {
  return lineNetUnitPrice(line) * line.quantity;
}

export function orderTotals(lines: readonly OrderLine[]): OrderTotals {
  return lines.reduce<OrderTotals>(
    (totals, line) => ({
      total: totals.total + lineTotal(line),
      available: totals.available + (line.availability === "immediate" ? lineTotal(line) : 0),
      units: totals.units + line.quantity,
    }),
    { total: 0, available: 0, units: 0 },
  );
}

/** Adds a line, merging quantities when the book is already in the order. */
export function addLine(lines: readonly OrderLine[], line: OrderLine): Result<OrderLine[], AddLineError> {
  if (!isValidQuantity(line.quantity)) return err("invalid_quantity");
  const existing = lines.find((current) => current.bookCode === line.bookCode);
  if (!existing) return ok([...lines, { ...line }]);
  return ok(
    lines.map((current) =>
      current.bookCode === line.bookCode ? { ...current, quantity: current.quantity + line.quantity } : current,
    ),
  );
}

export function removeLine(lines: readonly OrderLine[], bookCode: string): OrderLine[] {
  return lines.filter((line) => line.bookCode !== bookCode);
}

export function canDecreaseQuantity(line: Pick<OrderLine, "quantity">): boolean {
  return line.quantity > 1;
}

/** Quantities can only go down from the order screen: 1 ≤ new < current. */
export function decreaseQuantity(
  lines: readonly OrderLine[],
  bookCode: string,
  newQuantity: number,
): Result<OrderLine[], DecreaseQuantityError> {
  const line = lines.find((current) => current.bookCode === bookCode);
  if (!line) return err("not_found");
  if (!Number.isInteger(newQuantity)) return err("not_integer");
  if (newQuantity < 1) return err("below_minimum");
  if (newQuantity >= line.quantity) return err("not_lower");
  return ok(lines.map((current) => (current.bookCode === bookCode ? { ...current, quantity: newQuantity } : current)));
}
