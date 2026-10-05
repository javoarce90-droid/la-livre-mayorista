import type { ReactNode } from "react";
import { cx } from "./cx";

export type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-subtle text-ink-muted",
  brand: "border-brand-200 bg-brand-50 text-brand-800",
  success: "border-success-200 bg-success-50 text-success-700",
  warning: "border-warning-200 bg-warning-50 text-warning-700",
  danger: "border-danger-200 bg-danger-50 text-danger-700",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
