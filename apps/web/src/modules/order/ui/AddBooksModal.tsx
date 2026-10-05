"use client";

import type { BookView } from "@/modules/catalog/application/book-view";
import { AvailabilityPill } from "@/modules/catalog/ui/AvailabilityPill";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { Money } from "@/shared/ui/Money";
import { AddToOrderFlow, type AddHandler } from "./AddToOrderFlow";

export interface AddBooksModalProps {
  query: string;
  books: readonly BookView[];
  hasMore: boolean;
  pending: boolean;
  suspended: boolean;
  onLoadMore: () => void;
  onAdd: (book: BookView) => AddHandler;
  onClose: () => void;
}

/** "Agregar a mi pedido": search results with a quantity per row and the intervention flow. */
export function AddBooksModal({ query, books, hasMore, pending, suspended, onLoadMore, onAdd, onClose }: AddBooksModalProps) {
  return (
    <Modal
      size="lg"
      title="Agregar a mi pedido"
      onClose={onClose}
      footer={<Button onClick={onClose}>Listo</Button>}
    >
      <p className="mb-3 text-sm text-ink-muted">
        Resultados para <span className="font-mono text-ink">{query}</span>. Lo que agregues queda en el pedido cuando toques Guardar.
      </p>
      {books.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No encontramos libros con ese criterio.</p>
      ) : (
        <ul className="divide-y divide-line">
          {books.map((book) => (
            <li key={book.code} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{book.title}</p>
                <p className="text-xs text-ink-muted">
                  {book.author} · {book.publisher} · <span className="tabular-nums">{book.isbn}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <AvailabilityPill availability={book.availability} />
                  <Money cents={book.price.netPrice} className="text-sm font-semibold" />
                </div>
              </div>
              <div className="sm:w-80">
                <AddToOrderFlow variant="row" idPrefix={`add-${book.code}`} suspended={suspended} onAdd={onAdd(book)} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {hasMore ? (
        <div className="flex justify-center pt-3">
          <Button variant="secondary" disabled={pending} onClick={onLoadMore}>
            {pending ? "Buscando…" : "Buscar más resultados"}
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
