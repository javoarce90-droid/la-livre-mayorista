/** Uppercases, removes diacritics and collapses whitespace for case/accent-insensitive comparisons. */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}
