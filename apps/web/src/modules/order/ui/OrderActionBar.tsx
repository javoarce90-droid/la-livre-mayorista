"use client";

import { useId, useState } from "react";
import { ChevronUp, Pencil, Send } from "lucide-react";
import type { DeliveryZone } from "@/modules/account/domain/account";
import { Button } from "@/shared/ui/Button";
import { cx } from "@/shared/ui/cx";
import { Money } from "@/shared/ui/Money";
import type { OrderTotals } from "../domain/order";

export interface OrderActionBarProps {
  totals: OrderTotals;
  lineCount: number;
  /** Total of the last saved order, shown only while there are unsaved changes. */
  savedTotal: number | null;
  editing: boolean;
  zone: DeliveryZone;
  pending: boolean;
  canEdit: boolean;
  canDispatch: boolean;
  onEdit: () => void;
  onSave: () => void;
  onReviewDispatch: () => void;
}

/**
 * Sticky footer of the order card: live totals on the left, the commit actions on
 * the right. One dominant action, chosen by zone: in AMBA saving is enough (it
 * travels in the next delivery); in Interior nothing ships until it is dispatched.
 * Below `md` the pinned bar keeps only the total and that dominant action (thumb zone,
 * lines stay visible); secondary figures and the other action sit behind "Ver detalle".
 */
export function OrderActionBar({
  totals,
  lineCount,
  savedTotal,
  editing,
  zone,
  pending,
  canEdit,
  canDispatch,
  onEdit,
  onSave,
  onReviewDispatch,
}: OrderActionBarProps) {
  const dispatchFirst = zone === "Interior";
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  // Phones pin only the total and the dominant action; the rest waits behind "Ver detalle".
  const collapsible = expanded ? undefined : "max-md:hidden";

  const dispatchButton = (
    <Button
      size="lg"
      variant={dispatchFirst ? "dispatch" : "secondary"}
      onClick={onReviewDispatch}
      disabled={pending || !canDispatch}
      className={editing && !dispatchFirst ? collapsible : undefined}
    >
      <Send aria-hidden className="size-4" />
      Revisar y despachar…
    </Button>
  );

  return (
    <div className="sticky bottom-0 z-10 rounded-b-card border-t border-line bg-surface/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-5 sm:pb-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 md:flex-nowrap md:justify-between md:gap-3">
        <dl id={detailsId} className="flex min-w-0 flex-1 flex-wrap items-end gap-x-6 gap-y-1" aria-live="polite">
          <div className="flex items-baseline gap-2 md:block">
            <dt className="text-xs text-ink-muted">Total del pedido</dt>
            <dd className="text-lg font-semibold text-ink sm:text-2xl">
              <Money cents={totals.total} />
            </dd>
          </div>
          <div className={collapsible}>
            <dt className="text-xs text-ink-muted">Con stock ahora</dt>
            <dd className="font-medium text-ink">
              <Money cents={totals.available} />
            </dd>
          </div>
          <div className={collapsible}>
            <dt className="text-xs text-ink-muted">Títulos · ejemplares</dt>
            <dd className="font-medium tabular-nums text-ink">
              {lineCount} · {totals.units}
            </dd>
          </div>
          {savedTotal !== null ? (
            <div className={collapsible}>
              <dt className="text-xs text-warning-700">Cambios sin guardar</dt>
              <dd className="text-sm text-ink-muted">
                Antes: <Money cents={savedTotal} />
              </dd>
            </div>
          ) : null}
        </dl>

        <Button
          size="lg"
          variant="ghost"
          className="px-3 md:hidden"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded((current) => !current)}
        >
          {expanded ? "Ocultar detalle" : "Ver detalle"}
          <ChevronUp aria-hidden className={cx("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} />
        </Button>

        <div className="flex basis-full flex-col-reverse gap-2 sm:flex-row sm:justify-end md:basis-auto">
          {!editing ? (
            <>
              <Button size="lg" variant={dispatchFirst && canDispatch ? "secondary" : "primary"} onClick={onEdit} disabled={!canEdit}>
                <Pencil aria-hidden className="size-4" />
                Modificar
              </Button>
              {dispatchFirst && canDispatch && canEdit ? dispatchButton : null}
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant={dispatchFirst ? "secondary" : "primary"}
                onClick={onSave}
                disabled={pending}
                aria-busy={pending || undefined}
                className={dispatchFirst ? collapsible : undefined}
              >
                {pending ? "Guardando…" : dispatchFirst ? "Guardar sin despachar" : "Guardar cambios"}
              </Button>
              {dispatchButton}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
