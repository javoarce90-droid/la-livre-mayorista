"use client";

import type { ReactNode } from "react";
import { formatDate } from "@/shared/lib/format";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { Money } from "@/shared/ui/Money";
import type { BookView } from "../application/book-view";
import { AvailabilityPill } from "./AvailabilityPill";
import { BookCover } from "./BookCover";

const COLUMNS: DataColumn<BookView>[] = [
  { key: "cover", header: "Tapa", render: (book) => <BookCover promotion={book.promotion} />, hideOnMobile: true },
  { key: "isbn", header: "ISBN", render: (book) => <span className="tabular-nums text-ink-muted">{book.isbn}</span> },
  {
    key: "title",
    header: "Título",
    hideOnMobile: true,
    className: "min-w-48",
    render: (book) => <span className="font-medium text-ink">{book.title}</span>,
  },
  { key: "author", header: "Autor", render: (book) => book.author },
  { key: "publisher", header: "Editorial", render: (book) => book.publisher },
  { key: "price", header: "Precio", align: "right", render: (book) => <Money cents={book.price.listPrice} /> },
  { key: "age", header: "Edad", align: "center", render: (book) => book.recommendedAge ?? "—" },
  { key: "status", header: "Estado", render: (book) => <AvailabilityPill availability={book.availability} /> },
  { key: "subject", header: "Materia", render: (book) => book.subject },
  {
    key: "priceDate",
    header: "Fecha precio",
    render: (book) => <span className="tabular-nums text-ink-muted">{formatDate(book.priceDate)}</span>,
  },
];

export function BookResultsTable({
  books,
  onOpen,
  empty = "No encontramos libros con esa búsqueda. Probá con menos palabras o revisá la Ayuda.",
}: {
  books: readonly BookView[];
  onOpen: (book: BookView) => void;
  empty?: ReactNode;
}) {
  return (
    <DataTable
      caption="Resultados de la búsqueda"
      columns={COLUMNS}
      rows={books}
      getRowKey={(book) => book.code}
      onRowClick={onOpen}
      renderMobileHeader={(book) => (
        <div className="flex gap-3">
          <BookCover promotion={book.promotion} />
          <div className="min-w-0">
            <p className="font-medium text-ink">{book.title}</p>
            <p className="text-xs text-ink-muted">Tocá para ver la ficha</p>
          </div>
        </div>
      )}
      empty={empty}
    />
  );
}
