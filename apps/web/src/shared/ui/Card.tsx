import type { ReactNode } from "react";
import { cx } from "./cx";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-card border border-line bg-surface shadow-card", className)}>{children}</section>;
}

export function CardHeader({ title, actions, subtitle }: { title: ReactNode; actions?: ReactNode; subtitle?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("p-4 sm:p-5", className)}>{children}</div>;
}
