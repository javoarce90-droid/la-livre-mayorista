"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, CircleAlert, Plus } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Notice } from "@/shared/ui/Notice";
import type { AddBookResult } from "../application/add-book-to-order";
import { addBookErrorMessage, SUSPENDED_MESSAGE } from "./messages";

export type AddHandler = (quantity: number, confirmUnavailable: boolean) => Promise<AddBookResult> | AddBookResult;

type Step =
  | { name: "idle" | "quantity" }
  | { name: "intervention"; quantity: number }
  | { name: "success"; quantity: number }
  | { name: "error"; message: string };

export interface AddToOrderFlowProps {
  onAdd: AddHandler;
  suspended?: boolean;
  /** "sheet": button that opens a panel. "row": inline quantity + button (results modal). */
  variant?: "sheet" | "row";
  idPrefix: string;
}

/** Quantity → (optional) "Se requiere intervención" → confirmation. */
export function AddToOrderFlow({ onAdd, suspended = false, variant = "sheet", idPrefix }: AddToOrderFlowProps) {
  const [step, setStep] = useState<Step>({ name: variant === "row" ? "quantity" : "idle" });
  const [quantityText, setQuantityText] = useState("1");
  const [pending, startTransition] = useTransition();
  const quantityId = `${idPrefix}-qty`;

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

  const confirmQuantity = () => {
    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity < 1) {
      setStep({ name: "error", message: addBookErrorMessage("invalid_quantity") });
      return;
    }
    run(quantity, false);
  };

  const reset = () => {
    setQuantityText("1");
    setStep({ name: variant === "row" ? "quantity" : "idle" });
  };

  if (step.name === "success") {
    return (
      <div role="status" className="flex flex-wrap items-center gap-2 text-sm text-success-700">
        <CheckCircle2 aria-hidden className="size-4" />
        <span>
          {step.quantity === 1 ? "Agregaste 1 ejemplar" : `Agregaste ${step.quantity} ejemplares`} al pedido.
        </span>
        <Button variant="ghost" size="sm" onClick={reset}>
          Agregar más
        </Button>
      </div>
    );
  }

  if (step.name === "intervention") {
    return (
      <div role="alertdialog" aria-label="Se requiere intervención" className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm">
        <p className="flex items-center gap-2 font-semibold text-warning-700">
          <CircleAlert aria-hidden className="size-4" /> Se requiere intervención
        </p>
        <p className="mt-1 text-ink">El título no tiene stock inmediato. ¿Querés pedirlo igual?</p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" disabled={pending} onClick={() => run(step.quantity, true)}>
            Sí
          </Button>
          <Button size="sm" variant="secondary" disabled={pending} onClick={reset}>
            No
          </Button>
        </div>
      </div>
    );
  }

  if (step.name === "idle") {
    return (
      <Button className="w-full sm:w-auto" onClick={() => setStep({ name: "quantity" })}>
        <Plus aria-hidden className="size-4" />
        Agregar al pedido actual
      </Button>
    );
  }

  const quantityControls = (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={quantityId} className={variant === "row" ? "sr-only" : "text-sm text-ink-muted"}>
        Cantidad
      </label>
      <Input
        id={quantityId}
        type="number"
        inputMode="numeric"
        min={1}
        step={1}
        value={quantityText}
        onChange={(event) => setQuantityText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            confirmQuantity();
          }
        }}
        className="h-9 w-20"
      />
      <Button size="sm" disabled={pending} onClick={confirmQuantity}>
        {variant === "row" ? "Agregar" : "Confirmar"}
      </Button>
      {variant === "sheet" ? (
        <Button size="sm" variant="secondary" disabled={pending} onClick={reset}>
          Cancelar
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className={variant === "sheet" ? "rounded-lg border border-brand-200 bg-brand-50 p-3" : undefined}>
      {variant === "sheet" ? <p className="mb-2 text-sm font-semibold text-brand-900">Agregando al pedido actual</p> : null}
      {quantityControls}
      {step.name === "error" ? <p role="alert" className="mt-2 text-xs text-danger-700">{step.message}</p> : null}
    </div>
  );
}
