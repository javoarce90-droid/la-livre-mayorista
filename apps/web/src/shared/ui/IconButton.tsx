import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

const SIZES = {
  md: "size-9",
  /** 44 px on phones, 36 px from the `sm` breakpoint up. Use on any responsive surface. */
  touch: "size-11 sm:size-9",
} as const;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /** Accessible name (also used as tooltip). */
  label: string;
  icon: ReactNode;
  tone?: "default" | "inverse";
  size?: keyof typeof SIZES;
}

export function IconButton({ label, icon, tone = "default", size = "md", className, type = "button", ...props }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "relative inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        SIZES[size],
        tone === "inverse" ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-ink-muted hover:bg-subtle hover:text-ink",
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
