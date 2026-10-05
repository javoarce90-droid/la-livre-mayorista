"use client";

import { useState } from "react";
import { Button } from "@/shared/ui/Button";
import { Input, Label } from "@/shared/ui/Input";
import { Modal } from "@/shared/ui/Modal";
import { decreaseQuantity, type OrderLine } from "../domain/order";
import { decreaseQuantityErrorMessage } from "./messages";

export function DecreaseQuantityModal({
  line,
  lines,
  onClose,
  onConfirm,
}: {
  line: OrderLine;
  lines: readonly OrderLine[];
  onClose: () => void;
  onConfirm: (lines: OrderLine[]) => void;
}) {
  const [value, setValue] = useState(String(line.quantity - 1));
  const [error, setError] = useState<string | null>(null);

  const confirm = () => {
    const result = decreaseQuantity(lines, line.bookCode, value.trim() === "" ? Number.NaN : Number(value));
    if (!result.ok) {
      setError(decreaseQuantityErrorMessage(result.error, line.quantity));
      return;
    }
    onConfirm(result.value);
  };

  return (
    <Modal
      size="sm"
      title="Modificar cantidad"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={confirm}>Confirmar</Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-ink">
        <span className="font-medium">{line.title}</span>
        <br />
        <span className="text-ink-muted">Cantidad actual: {line.quantity}. Solo podés bajarla (mínimo 1).</span>
      </p>
      <Label htmlFor="new-quantity">Nueva cantidad</Label>
      <Input
        id="new-quantity"
        type="number"
        inputMode="numeric"
        min={1}
        max={line.quantity - 1}
        step={1}
        value={value}
        aria-invalid={error ? true : undefined}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && confirm()}
      />
      {error ? <p role="alert" className="mt-2 text-sm text-danger-700">{error}</p> : null}
    </Modal>
  );
}
