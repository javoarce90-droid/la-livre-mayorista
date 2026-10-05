"use client";

import type { ReactNode } from "react";
import { BellRing, Eye, EyeOff } from "lucide-react";
import { formatPercent } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Money } from "@/shared/ui/Money";
import { useToast } from "@/shared/ui/Toast";
import type { BookView } from "../application/book-view";
import { AvailabilityPill } from "./AvailabilityPill";
import { BookCover } from "./BookCover";
import { usePvpMode } from "./use-pvp-mode";

const sectionTitle = "text-[11px] font-semibold tracking-wider text-ink-muted uppercase";

export interface BookSheetProps {
  book: BookView;
  onClose: () => void;
  /** "Agregar al pedido" area; omitted when the sheet is opened read-only. */
  addSlot?: ReactNode;
}

function PriceBlock({ book, pvpMode }: { book: BookView; pvpMode: boolean }) {
  const { price, promotion } = book;
  if (pvpMode) {
    return (
      <div>
        <p className="text-xs text-ink-muted">PVP</p>
        <Money cents={price.listPrice} className="text-3xl font-semibold text-ink" />
      </div>
    );
  }
  const hasDiscount = price.netPrice < price.listPrice;
  const details = [
    price.discountPercent > 0 && `Descuento ${formatPercent(price.discountPercent)}`,
    price.promotionPercent > 0 && `Promoción -${price.promotionPercent}%`,
  ].filter(Boolean);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <Money cents={price.netPrice} className="text-3xl font-semibold text-ink" />
        {hasDiscount ? <Money cents={price.listPrice} strike className="text-sm text-ink-faint" /> : null}
        {promotion ? <Badge tone="danger">{promotion.name}</Badge> : null}
      </div>
      {details.length > 0 ? <p className="mt-1 text-xs text-ink-muted">{details.join(" · ")}</p> : null}
    </div>
  );
}

/** Organism: the "Ficha del libro", identical wherever a book row is clicked. */
export function BookSheet({ book, onClose, addSlot }: BookSheetProps) {
  const [pvpMode, setPvpMode] = usePvpMode();
  const toast = useToast();

  const technical: [string, ReactNode][] = [
    ["EAN", book.isbn],
    ["Editorial", book.publisher],
    ["Año de edición", book.year],
    ["Idioma", book.language],
    ["Materia", book.subject],
    ["Edad recomendada", book.recommendedAge ?? "—"],
    ["Páginas", book.pages],
  ];

  return (
    <Modal
      size="lg"
      title={`Ficha #${book.code}`}
      onClose={onClose}
      headerActions={
        <Button variant="secondary" size="sm" aria-pressed={pvpMode} onClick={() => setPvpMode(!pvpMode)}>
          {pvpMode ? <EyeOff aria-hidden className="size-3.5" /> : <Eye aria-hidden className="size-3.5" />}
          {pvpMode ? "Ocultar modo PVP" : "Ver modo PVP"}
        </Button>
      }
    >
      <div className="grid gap-6 md:grid-cols-[160px_minmax(0,1fr)_240px]">
        <div className="flex justify-center md:block">
          <BookCover promotion={pvpMode ? null : book.promotion} size="lg" />
        </div>

        <div className="min-w-0 space-y-4">
          <div>
            <h3 className="text-lg leading-snug font-semibold text-ink">{book.title}</h3>
            <p className="text-sm text-ink-muted">
              {book.author} · {book.publisher}
            </p>
          </div>
          <PriceBlock book={book} pvpMode={pvpMode} />
          <div>
            <p className={sectionTitle}>Disponibilidad</p>
            <div className="mt-1.5">
              <AvailabilityPill availability={book.availability} />
            </div>
          </div>
          {addSlot}
          {book.availability !== "immediate" ? (
            <Button variant="ghost" size="sm" onClick={() => toast("Listo: te avisamos cuando ingrese.")}>
              <BellRing aria-hidden className="size-3.5" />
              Notificarme cuando ingrese
            </Button>
          ) : null}
        </div>

        <div>
          <p className={sectionTitle}>Ficha técnica</p>
          <dl className="mt-2 divide-y divide-line text-xs">
            {technical.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-1.5">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-right font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-6 border-t border-line pt-4">
        <p className={sectionTitle}>Reseña</p>
        <p className="mt-2 text-sm leading-relaxed text-ink">{book.review}</p>
      </div>
    </Modal>
  );
}
