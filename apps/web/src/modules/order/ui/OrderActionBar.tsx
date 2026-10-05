"use client";

import { Pencil, Send, Upload } from "lucide-react";
import { Button } from "@/shared/ui/Button";

export interface OrderActionBarProps {
  editing: boolean;
  pending: boolean;
  canEdit: boolean;
  canDispatch: boolean;
  onEdit: () => void;
  onSave: () => void;
  onSaveAndDispatch: () => void;
  onImport: () => void;
  onCancel: () => void;
}

/** Rendered above and below the table. */
export function OrderActionBar({ editing, pending, canEdit, canDispatch, onEdit, onSave, onSaveAndDispatch, onImport, onCancel }: OrderActionBarProps) {
  if (!editing) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button onClick={onEdit} disabled={!canEdit}>
          <Pencil aria-hidden className="size-4" />
          Modificar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button onClick={onSave} disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      <Button variant="dispatch" onClick={onSaveAndDispatch} disabled={pending || !canDispatch}>
        <Send aria-hidden className="size-4" />
        Guardar y Despachar
      </Button>
      <Button variant="secondary" onClick={onImport} disabled={pending}>
        <Upload aria-hidden className="size-4" />
        Importar
      </Button>
      <div className="flex-1" />
      <Button variant="secondary" onClick={onCancel} disabled={pending}>
        Cancelar
      </Button>
    </div>
  );
}
