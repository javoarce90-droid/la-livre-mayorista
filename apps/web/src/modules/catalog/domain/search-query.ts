import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export type SearchField = "title" | "author" | "publisher" | "isbn" | "code";

export interface SearchCriterion {
  field: SearchField;
  text: string;
}

export type SearchQuery =
  /** Plain text (default): every word must appear in title, author, publisher, ISBN or code. */
  | { kind: "keywords"; words: string[] }
  /** Legacy letter shortcut without `+`: position alphabetically (title/author), prefix (publisher) or exact (isbn/code). */
  | { kind: "position"; field: SearchField; text: string }
  /** Legacy `+` shortcut: every text must appear anywhere in its field. */
  | { kind: "contains"; criteria: SearchCriterion[] }
  /** Exact ISBN: scanner input starting with `*` or `(`, or 13 digits typed with or without dashes. */
  | { kind: "isbn"; isbn: string };

export type SearchQueryError =
  | "empty"
  | "unknown_field"
  | "missing_text"
  | "space_after_letter"
  | "invalid_isbn"
  | "missing_plus";

export interface SearchFieldDefinition {
  letter: string;
  field: SearchField;
  label: string;
}

export const SEARCH_FIELDS: readonly SearchFieldDefinition[] = [
  { letter: "T", field: "title", label: "Título" },
  { letter: "A", field: "author", label: "Autor" },
  { letter: "E", field: "publisher", label: "Editorial" },
  { letter: "I", field: "isbn", label: "ISBN" },
  { letter: "C", field: "code", label: "Código" },
];

const BARCODE_LABEL = "Código de barras";
const ISBN_LABEL = "ISBN";
const ISBN_PATTERN = /^\d{13}$/;

export function fieldLabel(field: SearchField): string {
  return SEARCH_FIELDS.find((definition) => definition.field === field)?.label ?? field;
}

function fieldForLetter(letter: string): SearchFieldDefinition | undefined {
  return SEARCH_FIELDS.find((definition) => definition.letter === letter.toUpperCase());
}

function isBarcode(input: string): boolean {
  return input.startsWith("*") || input.startsWith("(");
}

/** Accepts ISBNs typed with dashes or spaces (978-950-307-406-0) and returns the 13 digits, or null. */
export function normalizeIsbn(input: string): string | null {
  if (!/^[\d\s-]+$/.test(input)) return null;
  const digits = input.replace(/[\s-]/g, "");
  return ISBN_PATTERN.test(digits) ? digits : null;
}

function parseCriterion(token: string): Result<SearchCriterion, SearchQueryError> {
  if (token.length === 0) return err("missing_text");
  const definition = fieldForLetter(token[0]);
  if (!definition) return err("unknown_field");
  const rest = token.slice(1);
  if (rest.trim().length === 0) return err("missing_text");
  if (/^\s/.test(rest)) return err("space_after_letter");
  const text = rest.trim();
  if (definition.field === "isbn") {
    const isbn = normalizeIsbn(text);
    return isbn ? ok({ field: "isbn", text: isbn }) : err("invalid_isbn");
  }
  return ok({ field: definition.field, text });
}

/**
 * Parses the search box.
 * - Plain text is a keyword search (no prefix needed).
 * - 13 digits (dashes allowed) or scanner input (`*`/`(`) is an exact ISBN.
 * - `+T…`, `+A…` keep working as the legacy combined shortcut.
 */
export function parseSearchQuery(raw: string): Result<SearchQuery, SearchQueryError> {
  const input = raw.trim();
  if (input.length === 0) return err("empty");

  if (isBarcode(input)) {
    const isbn = input.replace(/[*()\s-]/g, "");
    return ISBN_PATTERN.test(isbn) ? ok({ kind: "isbn", isbn }) : err("invalid_isbn");
  }

  const isbn = normalizeIsbn(input);
  if (isbn) return ok({ kind: "isbn", isbn });

  if (input.startsWith("+")) {
    const tokens = input.split(/\s+(?=\+)/).map((token) => token.slice(1));
    const criteria: SearchCriterion[] = [];
    for (const token of tokens) {
      const parsed = parseCriterion(token);
      if (!parsed.ok) return parsed;
      criteria.push(parsed.value);
    }
    return ok({ kind: "contains", criteria });
  }

  // "TCUENTOS +ABORGES": clearly the legacy combined syntax with the first + missing.
  if (/\s\+[A-Za-z]/.test(input)) return err("missing_plus");

  return ok({ kind: "keywords", words: input.split(/\s+/) });
}

/**
 * Legacy letter shortcut without `+` (TCASA, ABORGES, I978…). It is ambiguous with plain text
 * ("Antología" starts with A), so it is only tried when the keyword search finds nothing.
 */
export function parseLegacyShortcut(raw: string): SearchQuery | null {
  const input = raw.trim();
  if (input.length < 2 || input.startsWith("+") || isBarcode(input)) return null;
  const parsed = parseCriterion(input);
  return parsed.ok ? { kind: "position", ...parsed.value } : null;
}

/** Label for the "active criterion" chip; only shown when the input is unambiguous. */
export function criterionLabel(raw: string): string | null {
  const input = raw.trim();
  if (input.length === 0) return null;
  if (isBarcode(input)) return BARCODE_LABEL;
  if (normalizeIsbn(input)) return ISBN_LABEL;
  if (input.startsWith("+") && input[1]) return fieldForLetter(input[1])?.label ?? null;
  return null;
}
