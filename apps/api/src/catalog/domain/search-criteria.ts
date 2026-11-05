export const MAX_SEARCH_WORDS = 10;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Catalog search. Every word of each list must match (AND), case- and
 * accent-insensitively:
 * - `words`: title, author names, ISBN or publisher brand.
 * - `authorWords`: author names. `publisherWords`: publisher brand.
 */
export interface CatalogSearchCriteria {
  words: string[];
  authorWords: string[];
  publisherWords: string[];
  offset: number;
  limit: number;
}

/** "978-950-07" → "97895007" so ISBN fragments typed with dashes match. */
function normalizeWord(word: string): string {
  return /^[\d-]+$/.test(word) ? word.replace(/-/g, '') : word;
}

export function toSearchWords(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\s+/)
    .map(normalizeWord)
    .filter((word) => word.length > 0)
    .slice(0, MAX_SEARCH_WORDS);
}
