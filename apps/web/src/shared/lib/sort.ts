import { normalizeText } from "./text";

export type SortDirection = "asc" | "desc";
export interface SortState<K extends string = string> {
  key: K;
  direction: SortDirection;
}

type Sortable = string | number | null | undefined;

function compare(a: Sortable, b: Sortable): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return normalizeText(String(a)).localeCompare(normalizeText(String(b)), "es");
}

/** Returns a sorted copy; `getValue` extracts the comparable value for a column key. */
export function sortRows<T, K extends string>(
  rows: readonly T[],
  sort: SortState<K> | null,
  getValue: (row: T, key: K) => Sortable,
): T[] {
  const copy = [...rows];
  if (!sort) return copy;
  const factor = sort.direction === "asc" ? 1 : -1;
  return copy.sort((a, b) => factor * compare(getValue(a, sort.key), getValue(b, sort.key)));
}

/** Clicking a header: new column starts ascending; same column toggles. */
export function nextSort<K extends string>(current: SortState<K> | null, key: K): SortState<K> {
  if (current?.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { key, direction: "asc" };
}
