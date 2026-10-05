function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Formats an amount expressed in cents as es-AR money: `$ 184.320,00`. */
export function formatMoney(cents: number): string {
  const rounded = Math.round(cents);
  const sign = rounded < 0 ? "-" : "";
  const absolute = Math.abs(rounded);
  const integer = Math.floor(absolute / 100).toString();
  const decimals = (absolute % 100).toString().padStart(2, "0");
  return `${sign}$ ${groupThousands(integer)},${decimals}`;
}

/** `10` → `10,00%` */
export function formatPercent(value: number): string {
  return `${value.toFixed(2).replace(".", ",")}%`;
}

/** Order "Bonif." column: `10 %`, `10 % +5 %`, `+15 %` or `—`. */
export function formatBonus(discountPercent: number, promotionPercent: number): string {
  const parts: string[] = [];
  if (discountPercent > 0) parts.push(`${discountPercent} %`);
  if (promotionPercent > 0) parts.push(`+${promotionPercent} %`);
  return parts.length > 0 ? parts.join(" ") : "—";
}

/** `2026-08-14` → `14/08/2026` (calendar date, timezone-agnostic). */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Relative calendar-day label: Hoy / Ayer / Hace N días / Sin pedidos. */
export function formatRelativeDays(date: Date | string | null, now: Date = new Date()): string {
  if (date === null) return "Sin pedidos";
  const value = typeof date === "string" ? new Date(date) : date;
  const days = Math.round((startOfDay(now) - startOfDay(value)) / DAY_MS);
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}
