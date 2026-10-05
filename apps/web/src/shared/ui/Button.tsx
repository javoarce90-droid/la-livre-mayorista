import type { ButtonHTMLAttributes } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "dispatch";
export type ButtonSize = "sm" | "md";

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
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cx(
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:cursor-not-allowed",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}
