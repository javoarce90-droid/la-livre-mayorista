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
export type ChangeQuantityError = "not_found" | "not_integer" | "below_minimum" | "above_maximum";

/** What changed between the last saved order and the draft. */
export interface OrderDiff {
  added: OrderLine[];
  removed: OrderLine[];
  changed: { line: OrderLine; from: number; to: number }[];
}

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

/**
 * The single parser for every quantity field (order lines, "Agregar al pedido").
 * Liberal on input (Postel): surrounding/inner spaces, a leading "+" and thousands
 * dots ("1.000") are accepted. Returns the whole number typed — validity (>= 1,
 * ceilings) is the caller's rule — or null when it is not a whole number.
 */
export function parseQuantity(text: string): number | null {
  const compact = text
    .replace(/\s+/g, "")
    .replace(/^\+/, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "");
  if (!/^-?\d+$/.test(compact)) return null;
  const quantity = Number(compact);
  return Number.isSafeInteger(quantity) ? quantity : null;
}

/**
 * The order screen never raises a quantity above what was already loaded (saved
 * or just added through search/import, which went through the stock check).
 * Within that ceiling the user can move freely: 1 ≤ new ≤ maximum. Going above
 * it means adding the book again, so the availability check runs.
 */
export function setLineQuantity(
  lines: readonly OrderLine[],
  bookCode: string,
  newQuantity: number,
  maximum: number,
): Result<OrderLine[], ChangeQuantityError> {
  const line = lines.find((current) => current.bookCode === bookCode);
  if (!line) return err("not_found");
  if (!Number.isInteger(newQuantity)) return err("not_integer");
  if (newQuantity < 1) return err("below_minimum");
  if (newQuantity > maximum) return err("above_maximum");
  return ok(lines.map((current) => (current.bookCode === bookCode ? { ...current, quantity: newQuantity } : current)));
}

/** Re-inserts a removed line at its previous position (undo of `removeLine`). */
export function restoreLine(lines: readonly OrderLine[], line: OrderLine, index: number): OrderLine[] {
  if (lines.some((current) => current.bookCode === line.bookCode)) return [...lines];
  const position = Math.max(0, Math.min(index, lines.length));
  return [...lines.slice(0, position), { ...line }, ...lines.slice(position)];
}

export function diffOrder(before: readonly OrderLine[], after: readonly OrderLine[]): OrderDiff {
  const previous = new Map(before.map((line) => [line.bookCode, line]));
  const next = new Set(after.map((line) => line.bookCode));
  const diff: OrderDiff = { added: [], removed: [], changed: [] };
  for (const line of after) {
    const old = previous.get(line.bookCode);
    if (!old) diff.added.push(line);
    else if (old.quantity !== line.quantity) diff.changed.push({ line, from: old.quantity, to: line.quantity });
  }
  for (const line of before) if (!next.has(line.bookCode)) diff.removed.push(line);
  return diff;
}

export function hasChanges(diff: OrderDiff): boolean {
  return diff.added.length + diff.removed.length + diff.changed.length > 0;
}
