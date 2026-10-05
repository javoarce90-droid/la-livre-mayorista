import type { Book } from "@/modules/catalog/domain/book";
import type { OrderLine } from "../domain/order";
import { evaluateImport, parseImportCsv, type ImportCriterion, type ImportError } from "../domain/order-import";
import { buildOrderLine, type OrderAccount, type OrderDeps } from "./order-context";

export interface ImportPreview {
  /** Lines to ADD to the draft order. */
  lines: OrderLine[];
  errors: ImportError[];
}

export async function previewImport(
  deps: OrderDeps,
  input: { account: OrderAccount; csv: string; criterion: ImportCriterion },
): Promise<ImportPreview> {
  const rows = parseImportCsv(input.csv);
  const isbns = [...new Set(rows.map((row) => row.isbn).filter((isbn) => /^\d{13}$/.test(isbn)))];
  const found = await Promise.all(isbns.map((isbn) => deps.catalog.findByIsbn(isbn)));
  const books = new Map<string, Book>();
  found.forEach((book) => book && books.set(book.isbn, book));

  const evaluation = evaluateImport(rows, input.criterion, (isbn) => books.get(isbn));
  return {
    lines: evaluation.accepted.map(({ book, quantity }) =>
      buildOrderLine(book, input.account.discountPercent, quantity, deps.today),
    ),
    errors: evaluation.errors,
  };
}
