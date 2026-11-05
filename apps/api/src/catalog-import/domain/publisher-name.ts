/**
 * Canonical form used to compare publisher names from the feed: trimmed and
 * upper-cased. Accents are kept, so "Paidós" and "Paidos" stay different.
 */
export function normalizePublisherName(name: string): string {
  return name.trim().toUpperCase();
}
