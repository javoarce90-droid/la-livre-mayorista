import type { Availability } from "@/modules/catalog/domain/book";

/** TODOS / SOLAMENTE con stock / stock + reposición. */
export type ImportCriterion = "all" | "in_stock" | "stock_and_restock";

export type ImportErrorReason = "invalid_isbn" | "invalid_quantity" | "not_found" | "not_in_stock" | "not_available";

export interface ImportRow {
  /** 1-based line number in the source file. */
  row: number;
  isbn: string;
  quantity: string;
}

export interface ImportError {
  row: number;
  isbn: string;
  reason: ImportErrorReason;
}

export interface ImportEvaluation<B> {
  accepted: { row: number; book: B; quantity: number }[];
  errors: ImportError[];
}

function clean(cell: string | undefined): string {
  return (cell ?? "").trim().replace(/^"(.*)"$/, "$1").trim();
}

/** Parses a header-less CSV: column A = ISBN, column B = quantity. */
export function parseImportCsv(text: string): ImportRow[] {
  return text.split(/\r?\n/).flatMap((line, index) => {
    if (line.trim().length === 0) return [];
    const [isbn, quantity] = line.split(/[,;\t]/);
    return [{ row: index + 1, isbn: clean(isbn), quantity: clean(quantity) }];
  });
}

function criterionRejects(criterion: ImportCriterion, availability: Availability): ImportErrorReason | null {
  if (criterion === "in_stock" && availability !== "immediate") return "not_in_stock";
  if (criterion === "stock_and_restock" && availability === "out_of_stock") return "not_available";
  return null;
}

/** Validates each row against the catalog and the selected criterion. */
export function evaluateImport<B extends { availability: Availability }>(
  rows: readonly ImportRow[],
  criterion: ImportCriterion,
  lookup: (isbn: string) => B | undefined,
): ImportEvaluation<B> {
  const result: ImportEvaluation<B> = { accepted: [], errors: [] };
  for (const { row, isbn, quantity } of rows) {
    if (!/^\d{13}$/.test(isbn)) {
      result.errors.push({ row, isbn, reason: "invalid_isbn" });
      continue;
    }
    const book = lookup(isbn);
    if (!book) {
      result.errors.push({ row, isbn, reason: "not_found" });
      continue;
    }
    if (!/^\d+$/.test(quantity) || Number(quantity) < 1) {
      result.errors.push({ row, isbn, reason: "invalid_quantity" });
      continue;
    }
    const rejection = criterionRejects(criterion, book.availability);
    if (rejection) {
      result.errors.push({ row, isbn, reason: rejection });
      continue;
    }
    result.accepted.push({ row, book, quantity: Number(quantity) });
  }
  return result;
}
