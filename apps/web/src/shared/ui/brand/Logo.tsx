import { cx } from "../cx";

/** La Livre wordmark: an open book glyph + name. */
export function Logo({ compact = false, inverse = false }: { compact?: boolean; inverse?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5 font-semibold", inverse ? "text-white" : "text-brand-900")}>
      <svg aria-hidden viewBox="0 0 32 32" className="size-8 shrink-0">
        <rect width="32" height="32" rx="8" className={inverse ? "fill-brand-600" : "fill-brand-900"} />
        <path d="M7 10.5c3-1.2 6-1 9 .8v11.2c-3-1.8-6-2-9-.8z" fill="#fff" opacity=".95" />
        <path d="M25 10.5c-3-1.2-6-1-9 .8v11.2c3-1.8 6-2 9-.8z" fill="#fff" opacity=".7" />
      </svg>
      {compact ? <span className="sr-only">La Livre</span> : <span className="text-lg tracking-tight">La Livre</span>}
    </span>
  );
}
