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
const priceClass = "text-2xl font-semibold text-ink md:text-3xl";

export interface BookSheetProps {
  book: BookView;
  onClose: () => void;
  /** "Agregar al pedido" area, pinned to the sheet footer; omitted when the sheet is opened read-only. */
  addSlot?: ReactNode;
}

function PriceBlock({ book, pvpMode }: { book: BookView; pvpMode: boolean }) {
  const { price, promotion } = book;
  if (pvpMode) {
    return (
      <div>
        <p className="text-xs text-ink-muted">PVP</p>
        <Money cents={price.listPrice} className={priceClass} />
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
        <Money cents={price.netPrice} className={priceClass} />
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
        <Button variant="secondary" size="touch" aria-pressed={pvpMode} onClick={() => setPvpMode(!pvpMode)}>
          {pvpMode ? <EyeOff aria-hidden className="size-4 sm:size-3.5" /> : <Eye aria-hidden className="size-4 sm:size-3.5" />}
          {pvpMode ? "Ocultar modo PVP" : "Ver modo PVP"}
        </Button>
      }
      footer={addSlot ? <div className="w-full md:max-w-md">{addSlot}</div> : undefined}
    >
      {/* Phone: cover beside title + price so the decision data fits the first screen. Desktop: 3 columns. */}
      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-4 gap-y-6 md:grid-cols-[160px_minmax(0,1fr)_240px] md:gap-x-6">
        <div>
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
            {book.availability !== "immediate" ? (
              <Button
                variant="ghost"
                size="touch"
                className="-ml-3 mt-1"
                onClick={() => toast("Listo: te avisamos cuando ingrese.")}
              >
                <BellRing aria-hidden className="size-4 sm:size-3.5" />
                Notificarme cuando ingrese
              </Button>
            ) : null}
          </div>
        </div>

        <section aria-labelledby={`tech-${book.code}`} className="col-span-2 md:col-span-1">
          <h4 id={`tech-${book.code}`} className={sectionTitle}>
            Ficha técnica
          </h4>
          <dl className="mt-2 divide-y divide-line text-sm md:text-xs">
            {technical.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3 py-2 md:py-1.5">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="text-right font-medium text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>

      <section aria-labelledby={`review-${book.code}`} className="mt-6 border-t border-line pt-4">
        <h4 id={`review-${book.code}`} className={sectionTitle}>
          Reseña
        </h4>
        <p className="mt-2 text-sm leading-relaxed text-ink">{book.review}</p>
      </section>
    </Modal>
  );
}
