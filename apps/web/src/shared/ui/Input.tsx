import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-faint",
        "focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-subtle",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
      {children}
    </label>
  );
}
