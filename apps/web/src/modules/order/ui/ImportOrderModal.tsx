"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Notice } from "@/shared/ui/Notice";
import type { ImportPreview } from "../application/preview-import";
import type { ImportCriterion } from "../domain/order-import";
import { importOrderAction } from "./actions";
import { IMPORT_ERROR_LABEL } from "./messages";

const CRITERIA: { value: ImportCriterion; label: string; hint: string }[] = [
  { value: "all", label: "TODOS", hint: "Importa todos los títulos del archivo." },
  { value: "in_stock", label: "SOLAMENTE con stock", hint: "Solo los que tienen disponibilidad inmediata." },
  { value: "stock_and_restock", label: "Stock + reposición", hint: "Los disponibles y los que están en reposición (a pedido)." },
];

export function ImportOrderModal({ onClose, onImported }: { onClose: () => void; onImported: (preview: ImportPreview) => void }) {
  const [criterion, setCriterion] = useState<ImportCriterion>("all");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportPreview | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await importOrderAction(formData);
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setError(null);
      setResult(response);
      onImported(response);
    });
  };

  return (
    <Modal
      title="Importar pedido"
      onClose={onClose}
      footer={
        result ? (
          <Button onClick={onClose}>Listo</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" form="import-form" disabled={pending}>
              {pending ? "Importando…" : "Importar"}
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="space-y-5 text-sm">
          <section>
            <h3 className="flex items-center gap-2 font-semibold text-success-700">
              <CheckCircle2 aria-hidden className="size-4" />
              Libros importados con éxito ({result.lines.length})
            </h3>
            {result.lines.length > 0 ? (
              <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
                {result.lines.map((line, index) => (
                  <li key={`${line.bookCode}-${index}`} className="flex justify-between gap-3 px-3 py-2">
                    <span className="min-w-0 truncate">{line.title}</span>
                    <span className="shrink-0 tabular-nums text-ink-muted">× {line.quantity}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <section>
            <h3 className="flex items-center gap-2 font-semibold text-danger-700">
              <CircleAlert aria-hidden className="size-4" />
              Errores de importación ({result.errors.length})
            </h3>
            {result.errors.length > 0 ? (
              <ul className="mt-2 divide-y divide-line rounded-lg border border-danger-200">
                {result.errors.map((importError) => (
                  <li key={importError.row} className="flex flex-wrap justify-between gap-x-3 px-3 py-2">
                    <span>
                      Fila {importError.row} · <span className="tabular-nums">{importError.isbn || "(vacío)"}</span>
                    </span>
                    <span className="text-danger-700">{IMPORT_ERROR_LABEL[importError.reason]}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
          <Notice tone="warning">Los títulos importados se sumaron al pedido. Acordate de Guardar para reservar el stock.</Notice>
        </div>
      ) : (
        <form id="import-form" onSubmit={submit} className="space-y-5 text-sm">
          <div className="rounded-lg border border-line bg-subtle p-3 text-ink">
            <p className="font-medium">Formato del archivo</p>
            <ul className="mt-1 list-disc pl-5 text-ink-muted">
              <li>Planilla sin encabezados, guardada como <strong className="text-ink">.csv</strong>.</li>
              <li>Columna A: ISBN (13 dígitos, sin guiones).</li>
              <li>Columna B: cantidad.</li>
            </ul>
          </div>
          <fieldset>
            <legend className="mb-2 font-medium text-ink">¿Qué títulos importar?</legend>
            <div className="space-y-2">
              {CRITERIA.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line p-2.5 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                  <input
                    type="radio"
                    name="criterion"
                    value={option.value}
                    checked={criterion === option.value}
                    onChange={() => setCriterion(option.value)}
                    className="mt-0.5 accent-brand-600"
                  />
                  <span>
                    <span className="font-medium text-ink">{option.label}</span>
                    <span className="block text-xs text-ink-muted">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="import-file" className="mb-1.5 block font-medium text-ink">
              Archivo
            </label>
            <input
              id="import-file"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-800 hover:file:bg-brand-100"
            />
          </div>
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </form>
      )}
    </Modal>
  );
}
