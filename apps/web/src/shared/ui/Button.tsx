import type { ComponentPropsWithRef } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dispatch";
/**
 * One size scale for the whole app:
 * - sm / md: desktop density. Only for desktop-only surfaces.
 * - lg: 44 px tall at every breakpoint — the main action of a touch-first surface.
 * - touch: 44 px on phones (WCAG 2.5.5 / Apple HIG), compact `sm` from the `sm` breakpoint up.
 *   Default choice for secondary actions on responsive screens.
 */
export type ButtonSize = "sm" | "md" | "lg" | "touch";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-200",
  dispatch: "bg-success-800 text-white hover:bg-success-700 disabled:opacity-50",
  secondary: "border border-line bg-surface text-ink hover:bg-subtle disabled:opacity-50",
  ghost: "text-brand-700 hover:bg-brand-50 disabled:opacity-50",
  danger: "border border-danger-200 bg-surface text-danger-700 hover:bg-danger-50 disabled:opacity-50",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-sm",
  touch: "h-11 px-4 text-sm sm:h-8 sm:px-3 sm:text-xs",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

/** React 19: `ref` is a plain prop, forwarded to the <button> with the rest. */
export interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
