"use client";

import { useId, useState } from "react";
import { CircleAlert } from "lucide-react";
import { Stepper } from "@/shared/ui/Stepper";
import { parseQuantity, type ChangeQuantityError } from "../domain/order";
import { changeQuantityErrorMessage } from "./messages";

export interface QuantityStepperProps {
  /** Used in accessible names ("Cantidad de Rayuela"). */
  title: string;
  quantity: number;
  /** Highest quantity allowed from the order screen (what was already loaded). */
  maximum: number;
  /** Returns the domain error, or null when the change was applied. */
  onChange: (quantity: number) => ChangeQuantityError | null;
}

/**
 * Inline quantity editor for an order line.
 * Buttons apply immediately; the field applies on blur or Enter (not per keystroke).
 */
export function QuantityStepper({ title, quantity, maximum, onChange }: QuantityStepperProps) {
  const [text, setText] = useState(String(quantity));
  const [editingText, setEditingText] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // useId, not the book code: DataTable renders a desktop and a mobile copy of each row.
  const inputId = useId();
  const errorId = `${inputId}-error`;

  const apply = (next: number | null) => {
    const failure = next === null ? "not_integer" : onChange(next);
    setError(failure ? changeQuantityErrorMessage(failure, maximum) : null);
    if (!failure) setEditingText(false);
  };

  const commitText = () => {
    if (!editingText) return;
    const next = parseQuantity(text);
    if (next === quantity) {
      setEditingText(false);
      setError(null);
      return;
    }
    apply(next);
  };

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <Stepper
        inputId={inputId}
        label={`Cantidad de ${title}`}
        value={editingText ? text : String(quantity)}
        onValueChange={(next) => {
          setEditingText(true);
          setText(next);
          if (error) setError(null);
        }}
        onDecrement={() => apply(quantity - 1)}
        onIncrement={() => apply(quantity + 1)}
        decrementLabel={`Restar 1 a ${title}`}
        incrementLabel={`Sumar 1 a ${title}`}
        decrementHint="La cantidad mínima es 1. Para sacarlo usá Quitar."
        incrementHint={`Desde acá podés dejar hasta ${maximum}.`}
        atMinimum={quantity <= 1}
        atMaximum={quantity >= maximum}
        invalid={error !== null}
        errorId={errorId}
        onCommit={commitText}
        onBlur={commitText}
        onEscape={(event) => {
          if (!editingText) return;
          event.stopPropagation();
          setEditingText(false);
          setError(null);
        }}
      />
      {error ? (
        <p id={errorId} role="alert" className="flex max-w-48 items-start gap-1 text-left text-xs whitespace-normal text-danger-700">
          <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}
