"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { cx } from "@/shared/ui/cx";
import { Notice } from "@/shared/ui/Notice";
import { Stepper } from "@/shared/ui/Stepper";
import type { AddBookResult } from "../application/add-book-to-order";
import { isValidQuantity, parseQuantity } from "../domain/order";
import { addBookErrorMessage, SUSPENDED_MESSAGE } from "./messages";

export type AddHandler = (quantity: number, confirmUnavailable: boolean) => Promise<AddBookResult> | AddBookResult;

type Step =
  | { name: "quantity" }
  | { name: "intervention"; quantity: number }
  | { name: "success"; quantity: number }
  | { name: "error"; message: string };

export interface AddToOrderFlowProps {
  onAdd: AddHandler;
  suspended?: boolean;
  /** "sheet": full-width bar for the book sheet footer. "row": compact inline controls (results modal). */
  variant?: "sheet" | "row";
  idPrefix: string;
}

/** Quantity typed in the field when it is a valid one (whole number >= 1), else null. */
function validQuantity(text: string): number | null {
  const quantity = parseQuantity(text);
  return quantity !== null && isValidQuantity(quantity) ? quantity : null;
}

function copiesLabel(quantity: number) {
  return quantity === 1 ? "1 ejemplar" : `${quantity} ejemplares`;
}

/** Quantity (stepper) → (optional) "Se requiere intervención" → confirmation, all in place. */
export function AddToOrderFlow({ onAdd, suspended = false, variant = "sheet", idPrefix }: AddToOrderFlowProps) {
  const [step, setStep] = useState<Step>({ name: "quantity" });
  const [quantityText, setQuantityText] = useState("1");
  const [pending, startTransition] = useTransition();
  const quantityId = `${idPrefix}-qty`;
  const errorId = `${idPrefix}-qty-error`;
  const isSheet = variant === "sheet";

  if (suspended) {
    return <Notice tone="danger">{SUSPENDED_MESSAGE}</Notice>;
  }

  const run = (quantity: number, confirmUnavailable: boolean) => {
    startTransition(async () => {
      const result = await onAdd(quantity, confirmUnavailable);
      if (result.status === "added") setStep({ name: "success", quantity });
      else if (result.status === "needs_confirmation") setStep({ name: "intervention", quantity });
      else setStep({ name: "error", message: addBookErrorMessage(result.error) });
    });
  };

  const submit = () => {
    const quantity = validQuantity(quantityText);
    if (quantity === null) {
      setStep({ name: "error", message: addBookErrorMessage("invalid_quantity") });
      return;
    }
    setQuantityText(String(quantity));
    run(quantity, false);
  };

  const changeText = (text: string) => {
    setQuantityText(text);
    // Once in error, re-validate while typing so the message clears as soon as it's fixed.
    if (step.name === "error" && validQuantity(text) !== null) setStep({ name: "quantity" });
  };

  const stepBy = (delta: number) => {
    const current = validQuantity(quantityText) ?? 1;
    changeText(String(Math.max(1, current + delta)));
  };

  const startOver = () => {
    setQuantityText("1");
    setStep({ name: "quantity" });
  };

  if (step.name === "success") {
    return (
      <div
        role="status"
        className={cx("flex items-center gap-3 text-sm text-success-700", isSheet ? "w-full" : "flex-wrap")}
      >
        <CheckCircle2 aria-hidden className="size-5 shrink-0" />
        <span className="min-w-0 flex-1 font-medium">Agregaste {copiesLabel(step.quantity)} al pedido.</span>
        <Button variant="secondary" size={isSheet ? "lg" : "touch"} onClick={startOver}>
          Agregar más
        </Button>
      </div>
    );
  }

  if (step.name === "intervention") {
    return (
      <InterventionPrompt
        quantity={step.quantity}
        pending={pending}
        compact={!isSheet}
        onConfirm={() => run(step.quantity, true)}
        onCancel={() => setStep({ name: "quantity" })}
      />
    );
  }

  const quantity = validQuantity(quantityText);
  const hasError = step.name === "error";

  return (
    <div className={isSheet ? "w-full" : undefined}>
      <div className="flex items-center gap-3">
        <Stepper
          inputId={quantityId}
          label="Cantidad"
          value={quantityText}
          onValueChange={changeText}
          onDecrement={() => stepBy(-1)}
          onIncrement={() => stepBy(1)}
          decrementLabel="Restar un ejemplar"
          incrementLabel="Sumar un ejemplar"
          decrementHint="La cantidad mínima es 1."
          atMinimum={quantity === null || quantity <= 1}
          disabled={pending}
          invalid={hasError}
          errorId={errorId}
          onCommit={submit}
          // Sheet: always 44 px (main control of a touch surface). Row: 44 px on phones, compact on desktop.
          density={isSheet ? "large" : "touch"}
        />
        <Button
          size={isSheet ? "lg" : "touch"}
          disabled={pending}
          aria-busy={pending || undefined}
          onClick={submit}
          className={isSheet ? "flex-1" : "flex-1 sm:flex-none"}
        >
          {isSheet ? (pending ? "Agregando…" : "Agregar al pedido") : pending ? "Agregando…" : "Agregar"}
        </Button>
      </div>
      {hasError ? (
        <p id={errorId} role="alert" className="mt-2 flex items-start gap-1.5 text-sm text-danger-700">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {step.message}
        </p>
      ) : null}
    </div>
  );
}

function InterventionPrompt({
  quantity,
  pending,
  compact,
  onConfirm,
  onCancel,
}: {
  quantity: number;
  pending: boolean;
  compact: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  // Move focus into the prompt so screen readers announce it and keyboard users land on its buttons.
  useEffect(() => boxRef.current?.focus(), []);

  return (
    <div
      ref={boxRef}
      tabIndex={-1}
      role="alertdialog"
      aria-label="Se requiere intervención"
      className="w-full rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm outline-none"
    >
      <p className="flex items-center gap-2 font-semibold text-warning-700">
        <CircleAlert aria-hidden className="size-4" /> Se requiere intervención
      </p>
      <p className="mt-1 text-ink">
        El título no tiene stock inmediato. ¿Querés pedir {copiesLabel(quantity)} igual?
      </p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" size={compact ? "touch" : "lg"} disabled={pending} onClick={onCancel}>
          Cancelar
        </Button>
        <Button size={compact ? "touch" : "lg"} disabled={pending} onClick={onConfirm} className="flex-1 sm:flex-none">
          {pending ? "Agregando…" : "Pedir igual"}
        </Button>
      </div>
    </div>
  );
}
