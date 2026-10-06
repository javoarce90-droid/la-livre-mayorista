"use client";

import type { KeyboardEvent } from "react";
import { Minus, Plus } from "lucide-react";
import { cx } from "./cx";

/**
 * - touch: 44 px on phones, 36 px from `sm` up (rows inside responsive tables/lists).
 * - large: 44 px at every breakpoint (main control of a touch-first surface, e.g. a bottom sheet).
 */
export type StepperDensity = "touch" | "large";

const TARGET: Record<StepperDensity, string> = {
  touch: "size-11 sm:size-9",
  large: "size-11",
};

// 16 px text on phones keeps iOS Safari from zooming the page when the field takes focus.
const FIELD: Record<StepperDensity, string> = {
  touch: "h-11 w-14 text-base sm:h-9 sm:text-sm",
  large: "h-11 w-14 text-base",
};

const stepButton =
  "inline-flex shrink-0 items-center justify-center text-ink transition-colors hover:bg-subtle focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:text-ink-faint aria-disabled:cursor-not-allowed aria-disabled:text-ink-faint aria-disabled:hover:bg-transparent";

export interface StepperProps {
  inputId: string;
  /** Visually hidden label of the field ("Cantidad", "Cantidad de Rayuela"). */
  label: string;
  value: string;
  onValueChange: (text: string) => void;
  onDecrement: () => void;
  onIncrement: () => void;
  decrementLabel: string;
  incrementLabel: string;
  /** Tooltip that explains a limit (shown when the matching button is at its limit). */
  decrementHint?: string;
  incrementHint?: string;
  /** Limits use aria-disabled (not disabled) so focus is not lost when the limit is reached. */
  atMinimum: boolean;
  atMaximum?: boolean;
  /** Hard disable while a request is in flight. */
  disabled?: boolean;
  invalid?: boolean;
  /** id of the error message, linked with aria-describedby. */
  errorId?: string;
  onCommit?: () => void;
  onBlur?: () => void;
  onEscape?: (event: KeyboardEvent<HTMLInputElement>) => void;
  density?: StepperDensity;
}

/** Molecule: − [n] + quantity control. Text input (not type=number) so it accepts "1.000" or " 3 " and never "e". */
export function Stepper({
  inputId,
  label,
  value,
  onValueChange,
  onDecrement,
  onIncrement,
  decrementLabel,
  incrementLabel,
  decrementHint,
  incrementHint,
  atMinimum,
  atMaximum = false,
  disabled = false,
  invalid = false,
  errorId,
  onCommit,
  onBlur,
  onEscape,
  density = "touch",
}: StepperProps) {
  return (
    <div
      className={cx(
        "inline-flex items-center rounded-lg border bg-surface",
        invalid ? "border-danger-600" : "border-line focus-within:border-brand-600",
      )}
    >
      <button
        type="button"
        className={cx(stepButton, "rounded-l-lg", TARGET[density])}
        aria-label={decrementLabel}
        title={atMinimum && decrementHint ? decrementHint : decrementLabel}
        aria-disabled={atMinimum}
        disabled={disabled}
        onClick={() => !atMinimum && onDecrement()}
      >
        <Minus aria-hidden className="size-4" />
      </button>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        enterKeyHint="done"
        value={value}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => onValueChange(event.target.value)}
        onBlur={onBlur}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onCommit?.();
          } else if (event.key === "Escape") {
            onEscape?.(event);
          }
        }}
        className={cx(
          "scroll-mb-40 border-x border-line bg-surface text-center font-semibold tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600",
          invalid ? "text-danger-700" : "text-ink",
          FIELD[density],
        )}
      />
      <button
        type="button"
        className={cx(stepButton, "rounded-r-lg", TARGET[density])}
        aria-label={incrementLabel}
        title={atMaximum && incrementHint ? incrementHint : incrementLabel}
        aria-disabled={atMaximum}
        disabled={disabled}
        onClick={() => !atMaximum && onIncrement()}
      >
        <Plus aria-hidden className="size-4" />
      </button>
    </div>
  );
}
