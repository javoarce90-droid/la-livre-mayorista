import type { ReactNode } from "react";
import { AlertTriangle, CircleAlert, Info } from "lucide-react";
import { cx } from "./cx";

const TONES = {
  info: { box: "border-brand-200 bg-brand-50 text-brand-900", Icon: Info },
  warning: { box: "border-warning-200 bg-warning-50 text-warning-700", Icon: AlertTriangle },
  danger: { box: "border-danger-200 bg-danger-50 text-danger-700", Icon: CircleAlert },
} as const;

/** Molecule: inline banner with icon + message (+ optional action). */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const { box, Icon } = TONES[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("flex gap-3 rounded-lg border px-4 py-3 text-sm", box, className)}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cx(title && "mt-0.5")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0 self-center">{action}</div> : null}
    </div>
  );
}
