import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name (also used as tooltip). */
  label: string;
  icon: ReactNode;
  tone?: "default" | "inverse";
}

export function IconButton({ label, icon, tone = "default", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "relative inline-flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
        tone === "inverse" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-muted hover:bg-subtle hover:text-ink",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
