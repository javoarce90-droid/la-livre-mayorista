import { formatMoney } from "@/shared/lib/format";
import { cx } from "./cx";

export function Money({ cents, className, strike = false }: { cents: number; className?: string; strike?: boolean }) {
  const Tag = strike ? "s" : "span";
  return <Tag className={cx("tabular-nums whitespace-nowrap", className)}>{formatMoney(cents)}</Tag>;
}
