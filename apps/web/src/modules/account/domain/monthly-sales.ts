import type { MonthlySale } from "./account";

const MONTH_LABELS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export interface MonthlySalePoint extends MonthlySale {
  label: string;
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

/** Twelve months ending in `now`'s month, oldest first, missing months as zero. */
export function lastTwelveMonths(sales: readonly MonthlySale[], now: Date): MonthlySalePoint[] {
  const amounts = new Map(sales.map((sale) => [sale.month, sale.amount]));
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
    const month = monthKey(date.getFullYear(), date.getMonth());
    return { month, label: MONTH_LABELS[date.getMonth()], amount: amounts.get(month) ?? 0 };
  });
}
