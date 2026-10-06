"use client";

import { FileText, Trash2 } from "lucide-react";
import { AvailabilityPill } from "@/modules/catalog/ui/AvailabilityPill";
import { AVAILABILITY_LABEL } from "@/modules/catalog/ui/messages";
import { formatBonus, formatDate } from "@/shared/lib/format";
import { sortRows, type SortState } from "@/shared/lib/sort";
import { Button } from "@/shared/ui/Button";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { IconButton } from "@/shared/ui/IconButton";
import { Money } from "@/shared/ui/Money";
import { lineNetUnitPrice, lineTotal, type ChangeQuantityError, type OrderLine } from "../domain/order";
import { QuantityStepper } from "./QuantityStepper";

export type OrderSortKey =
  | "title"
  | "sku"
  | "isbn"
  | "status"
  | "originalDate"
  | "observation"
  | "unitPrice"
  | "quantity"
  | "bonus"
  | "price"
  | "total";

function sortValue(line: OrderLine, key: OrderSortKey): string | number | null {
  switch (key) {
    case "title":
      return line.title;
    case "sku":
      return line.bookCode;
    case "isbn":
      return line.isbn;
    case "status":
      return AVAILABILITY_LABEL[line.availability];
    case "originalDate":
      return line.originalDate;
    case "observation":
      return line.observation;
    case "unitPrice":
      return line.unitPrice;
    case "quantity":
      return line.quantity;
    case "bonus":
      return line.discountPercent + line.promotionPercent;
    case "price":
      return lineNetUnitPrice(line);
    case "total":
      return lineTotal(line);
  }
}

export interface OrderLinesTableProps {
  lines: readonly OrderLine[];
  editing: boolean;
  sort: SortState<OrderSortKey> | null;
  onSortChange: (key: OrderSortKey) => void;
  /** Highest quantity the line can be set to from this screen. */
  maxQuantity: (line: OrderLine) => number;
  /** Applies the change to the draft; returns the domain error or null. */
  onQuantityChange: (line: OrderLine, quantity: number) => ChangeQuantityError | null;
  /** Removes immediately; the container offers "Deshacer". */
  onRemove: (line: OrderLine) => void;
  onOpenSheet: (line: OrderLine) => void;
}

export function OrderLinesTable({
  lines,
  editing,
  sort,
  onSortChange,
  maxQuantity,
  onQuantityChange,
  onRemove,
  onOpenSheet,
}: OrderLinesTableProps) {
  const columns: DataColumn<OrderLine>[] = [
    { key: "title", header: "Título", sortable: true, hideOnMobile: true, className: "min-w-48", render: (line) => <span className="font-medium text-ink">{line.title}</span> },
    // Reference-only columns stay in consulta; edición keeps what you need to decide.
    ...(!editing
      ? [{ key: "sku", header: "SKU", sortable: true, render: (line: OrderLine) => <span className="tabular-nums text-ink-muted">{line.bookCode}</span> }]
      : []),
    { key: "isbn", header: "ISBN", sortable: true, render: (line) => <span className="tabular-nums text-ink-muted">{line.isbn}</span> },
    { key: "status", header: "Estado", sortable: true, render: (line) => <AvailabilityPill availability={line.availability} /> },
    ...(!editing
      ? [
          { key: "originalDate", header: "Fecha Orig.", sortable: true, render: (line: OrderLine) => <span className="tabular-nums">{formatDate(line.originalDate)}</span> },
          { key: "observation", header: "Observación", sortable: true, render: (line: OrderLine) => <span className="text-xs text-ink-muted">{line.observation ?? "—"}</span> },
        ]
      : []),
    { key: "unitPrice", header: "P. Unit.", sortable: true, align: "right", render: (line) => <Money cents={line.unitPrice} /> },
    {
      key: "quantity",
      header: "Cant.",
      sortable: true,
      align: "center",
      render: (line) =>
        editing ? (
          <QuantityStepper
            title={line.title}
            quantity={line.quantity}
            maximum={maxQuantity(line)}
            onChange={(quantity) => onQuantityChange(line, quantity)}
          />
        ) : (
          <span className="font-semibold tabular-nums">{line.quantity}</span>
        ),
    },
    { key: "bonus", header: "Bonif.", sortable: true, align: "right", render: (line) => <span className="whitespace-nowrap">{formatBonus(line.discountPercent, line.promotionPercent)}</span> },
    { key: "price", header: "Precio", sortable: true, align: "right", render: (line) => <Money cents={lineNetUnitPrice(line)} /> },
    { key: "total", header: "Total", sortable: true, align: "right", render: (line) => <Money cents={lineTotal(line)} className="font-semibold" /> },
    ...(editing
      ? [
          {
            key: "actions",
            header: "Acciones",
            align: "right" as const,
            render: (line: OrderLine) => (
              <div className="flex items-center justify-end gap-2">
                <IconButton label={`Ver ficha de ${line.title}`} size="touch" className="scroll-mb-40" icon={<FileText className="size-4" />} onClick={() => onOpenSheet(line)} />
                <Button size="touch" variant="danger" className="scroll-mb-40" aria-label={`Quitar ${line.title}`} onClick={() => onRemove(line)}>
                  <Trash2 aria-hidden className="size-3.5" />
                  Quitar
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <DataTable
      caption="Líneas del pedido"
      columns={columns}
      rows={sortRows(lines, sort, sortValue)}
      getRowKey={(line) => line.bookCode}
      sort={sort}
      onSortChange={(key) => onSortChange(key as OrderSortKey)}
      rowTone={(line) => (line.availability === "out_of_stock" ? "danger" : null)}
      renderMobileHeader={(line) => <p className="font-medium text-ink">{line.title}</p>}
      empty={
        editing
          ? "El pedido quedó sin títulos. Buscalos abajo o importá un archivo."
          : "Tu pedido no tiene títulos. Tocá Modificar para agregarlos, o buscalos desde Libros."
      }
    />
  );
}
