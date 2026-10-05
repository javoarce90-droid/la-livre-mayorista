"use server";

import { revalidatePath } from "next/cache";
import { orderDeps } from "@/composition";
import { requirePortalContext } from "@/portal-context";
import { addBookToOrder, type AddBookResult } from "../application/add-book-to-order";
import { previewImport, type ImportPreview } from "../application/preview-import";
import { saveOrder, type SaveOrderLineInput } from "../application/save-order";
import type { ImportCriterion } from "../domain/order-import";
import { saveOrderErrorMessage } from "./messages";

export async function addToOrderAction(input: {
  bookCode: string;
  quantity: number;
  confirmUnavailable: boolean;
}): Promise<AddBookResult> {
  const { account } = await requirePortalContext();
  const result = await addBookToOrder(orderDeps(), {
    account,
    bookCode: String(input.bookCode),
    quantity: Number(input.quantity),
    confirmUnavailable: input.confirmUnavailable === true,
  });
  if (result.status === "added") revalidatePath("/", "layout");
  return result;
}

export type SaveOrderActionResult = { ok: true; dispatched: boolean } | { ok: false; message: string };

export async function saveOrderAction(input: {
  lines: SaveOrderLineInput[];
  dispatch: boolean;
}): Promise<SaveOrderActionResult> {
  const { account } = await requirePortalContext();
  const lines = Array.isArray(input.lines)
    ? input.lines.map((line) => ({ bookCode: String(line.bookCode), quantity: Number(line.quantity) }))
    : [];
  const result = await saveOrder(orderDeps(), { account, lines, dispatch: input.dispatch === true });
  if (result.status === "error") return { ok: false, message: saveOrderErrorMessage(result.error) };
  revalidatePath("/", "layout");
  return { ok: true, dispatched: result.status === "dispatched" };
}

const CRITERIA: readonly ImportCriterion[] = ["all", "in_stock", "stock_and_restock"];
const MAX_IMPORT_BYTES = 1024 * 1024;

export type ImportActionResult = ({ ok: true } & ImportPreview) | { ok: false; message: string };

/** Reads a header-less CSV (A = ISBN, B = cantidad) and returns lines to add to the draft. */
export async function importOrderAction(formData: FormData): Promise<ImportActionResult> {
  const { account } = await requirePortalContext();
  const file = formData.get("file");
  const criterionInput = String(formData.get("criterion") ?? "all");
  const criterion = CRITERIA.find((value) => value === criterionInput) ?? "all";

  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Elegí un archivo .csv para importar." };
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { ok: false, message: "Por ahora solo se aceptan archivos .csv. Desde Excel: Archivo → Guardar como → CSV." };
  }
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, message: "El archivo supera 1 MB." };

  const preview = await previewImport(orderDeps(), { account, csv: await file.text(), criterion });
  return { ok: true, ...preview };
}
