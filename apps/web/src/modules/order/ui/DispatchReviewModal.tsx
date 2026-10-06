"use client";

import { useRef } from "react";
import { Send } from "lucide-react";
import type { DeliveryZone } from "@/modules/account/domain/account";
import { AvailabilityPill } from "@/modules/catalog/ui/AvailabilityPill";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Money } from "@/shared/ui/Money";
import { Notice } from "@/shared/ui/Notice";
import { hasChanges, lineTotal, orderTotals, type OrderDiff, type OrderLine } from "../domain/order";

export interface DispatchReviewModalProps {
  lines: readonly OrderLine[];
  /** Changes against the last saved order (empty when dispatching what is already saved). */
  diff: OrderDiff;
  zone: DeliveryZone;
  pending: boolean;
  error: string | null;
  onConfirm: () => void;
  onClose: () => void;
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Last step before the irreversible send: what goes, what waits, what changed, how much. */
export function DispatchReviewModal({ lines, diff, zone, pending, error, onConfirm, onClose }: DispatchReviewModalProps) {
  const backRef = useRef<HTMLButtonElement>(null);
  const totals = orderTotals(lines);
  const waiting = lines.filter((line) => line.availability !== "immediate");
  const changed = hasChanges(diff);

  return (
    <Modal
      size="md"
      title="Revisá tu pedido antes de despacharlo"
      initialFocusRef={backRef}
      onClose={pending ? () => {} : onClose}
      footer={
        <>
          <Button ref={backRef} size="lg" variant="secondary" disabled={pending} onClick={onClose}>
            Volver al pedido
          </Button>
          <Button size="lg" variant="dispatch" disabled={pending} aria-busy={pending || undefined} onClick={onConfirm}>
            <Send aria-hidden className="size-4" />
            {pending ? "Despachando…" : (
              <>
                Despachar pedido · <Money cents={totals.total} />
              </>
            )}
          </Button>
        </>
      }
    >
      <div className="space-y-6 text-sm">
        <p className="text-ink">
          Al despacharlo, el pedido se cierra y ya no se puede modificar.
          {zone === "Interior" ? " Sale con el próximo envío a tu zona." : " Sale en la próxima entrega."}
        </p>

        <dl className="grid grid-cols-3 gap-2" aria-label="Resumen del pedido">
          <div className="rounded-lg border border-line bg-subtle px-3 py-2">
            <dt className="text-xs text-ink-muted">Títulos</dt>
            <dd className="text-lg font-semibold tabular-nums text-ink">{lines.length}</dd>
          </div>
          <div className="rounded-lg border border-line bg-subtle px-3 py-2">
            <dt className="text-xs text-ink-muted">Ejemplares</dt>
            <dd className="text-lg font-semibold tabular-nums text-ink">{totals.units}</dd>
          </div>
          <div className="rounded-lg border border-line bg-subtle px-3 py-2">
            <dt className="text-xs text-ink-muted">Total</dt>
            <dd className="text-lg font-semibold text-ink">
              <Money cents={totals.total} />
            </dd>
          </div>
        </dl>

        <section aria-labelledby="review-stock">
          <h3 id="review-stock" className="font-semibold text-ink">
            Qué sale ahora y qué queda pendiente
          </h3>
          <dl className="mt-2 divide-y divide-line rounded-lg border border-line">
            <div className="flex justify-between gap-3 px-3 py-2">
              <dt>Con stock ahora ({plural(lines.length - waiting.length, "título", "títulos")})</dt>
              <dd>
                <Money cents={totals.available} className="font-medium" />
              </dd>
            </div>
            <div className="flex justify-between gap-3 px-3 py-2">
              <dt>Sin stock o a pedido ({plural(waiting.length, "título", "títulos")})</dt>
              <dd>
                <Money cents={totals.total - totals.available} className="font-medium" />
              </dd>
            </div>
          </dl>
          {waiting.length > 0 ? (
            <>
              <p className="mt-3 text-ink-muted">Estos títulos van en el pedido y se despachan cuando ingresen:</p>
              <ul className="mt-1.5 space-y-1.5">
                {waiting.map((line) => (
                  <li key={line.bookCode} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 flex-1 truncate text-ink">
                      {line.title} <span className="tabular-nums text-ink-muted">× {line.quantity}</span>
                    </span>
                    <AvailabilityPill availability={line.availability} />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        {changed ? (
          <section aria-labelledby="review-changes">
            <h3 id="review-changes" className="font-semibold text-ink">
              Cambios desde la última vez que guardaste
            </h3>
            <ul className="mt-2 space-y-1 text-ink">
              {diff.added.map((line) => (
                <li key={`a-${line.bookCode}`}>
                  <span className="font-medium text-success-700">Agregado:</span> {line.title}{" "}
                  <span className="tabular-nums text-ink-muted">× {line.quantity} · <Money cents={lineTotal(line)} /></span>
                </li>
              ))}
              {diff.changed.map(({ line, from, to }) => (
                <li key={`c-${line.bookCode}`}>
                  <span className="font-medium text-brand-700">Cantidad:</span> {line.title}{" "}
                  <span className="tabular-nums text-ink-muted">
                    {from} → {to}
                  </span>
                </li>
              ))}
              {diff.removed.map((line) => (
                <li key={`r-${line.bookCode}`}>
                  <span className="font-medium text-danger-700">Quitado:</span> <s>{line.title}</s>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {error ? <Notice tone="danger" title="No pudimos despachar el pedido">{error} Tus cambios siguen acá.</Notice> : null}
      </div>
    </Modal>
  );
}
