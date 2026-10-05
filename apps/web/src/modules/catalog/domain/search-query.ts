import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export type SearchField = "title" | "author" | "publisher" | "isbn" | "code";

export interface SearchCriterion {
  field: SearchField;
  text: string;
}

export type SearchQuery =
  /** No `+`: position alphabetically (title/author), prefix (publisher) or exact (isbn/code). */
  | { kind: "position"; field: SearchField; text: string }
  /** `+` criteria: every text must appear anywhere in its field. */
  | { kind: "contains"; criteria: SearchCriterion[] }
  /** Scanner input starting with `*` or `(`. */
  | { kind: "barcode"; isbn: string };

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
const ISBN_PATTERN = /^\d{13}$/;

function fieldForLetter(letter: string): SearchFieldDefinition | undefined {
  return SEARCH_FIELDS.find((definition) => definition.letter === letter.toUpperCase());
}

function isBarcode(input: string): boolean {
  return input.startsWith("*") || input.startsWith("(");
}

function parseCriterion(token: string): Result<SearchCriterion, SearchQueryError> {
  if (token.length === 0) return err("missing_text");
  const definition = fieldForLetter(token[0]);
  if (!definition) return err("unknown_field");
  const rest = token.slice(1);
  if (rest.trim().length === 0) return err("missing_text");
  if (/^\s/.test(rest)) return err("space_after_letter");
  const text = rest.trim();
  if (definition.field === "isbn" && !ISBN_PATTERN.test(text)) return err("invalid_isbn");
  return ok({ field: definition.field, text });
}

/** Parses the single search box syntax (see the "? Ayuda" modal). */
export function parseSearchQuery(raw: string): Result<SearchQuery, SearchQueryError> {
  const input = raw.trim();
  if (input.length === 0) return err("empty");

  if (isBarcode(input)) {
    const isbn = input.replace(/[*()\s]/g, "");
    return ISBN_PATTERN.test(isbn) ? ok({ kind: "barcode", isbn }) : err("invalid_isbn");
  }

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

  if (/\s\+/.test(input)) return err("missing_plus");

  const parsed = parseCriterion(input);
  if (!parsed.ok) return parsed;
  return ok({ kind: "position", ...parsed.value });
}

/** Label for the "active criterion" chip, derived from the first letter. */
export function criterionLabel(raw: string): string | null {
  const input = raw.trimStart();
  if (input.length === 0) return null;
  if (isBarcode(input)) return BARCODE_LABEL;
  const letter = input.startsWith("+") ? input[1] : input[0];
  if (!letter) return null;
  return fieldForLetter(letter)?.label ?? null;
}
