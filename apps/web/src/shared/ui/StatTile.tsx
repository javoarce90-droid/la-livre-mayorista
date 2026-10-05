import type { ReactNode } from "react";
import { cx } from "./cx";

/** Molecule: small label + value tile used in dashboard and order summary. */
export function StatTile({
  label,
  value,
  footer,
  tone = "neutral",
  size = "md",
}: {
  label: string;
  value: ReactNode;
  footer?: ReactNode;
  tone?: "neutral" | "danger";
  size?: "md" | "lg";
}) {
  return (
    <div
      className={cx(
        "min-w-0 rounded-lg border px-4 py-3",
        tone === "danger" ? "border-danger-200 bg-danger-50" : "border-line bg-subtle",
      )}
    >
      <p className={cx("text-xs", tone === "danger" ? "text-danger-700" : "text-ink-muted")}>{label}</p>
      <p
        className={cx(
          "mt-1 font-semibold",
          size === "lg" ? "text-xl sm:text-2xl" : "text-base",
          tone === "danger" ? "text-danger-700" : "text-ink",
        )}
      >
        {value}
      </p>
      {footer ? <div className="mt-1 text-xs">{footer}</div> : null}
    </div>
  );
}
