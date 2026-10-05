"use client";

import { FileText, Minus, Trash2 } from "lucide-react";
import { AvailabilityPill } from "@/modules/catalog/ui/AvailabilityPill";
import { AVAILABILITY_LABEL } from "@/modules/catalog/ui/messages";
import { formatBonus, formatDate } from "@/shared/lib/format";
import { sortRows, type SortState } from "@/shared/lib/sort";
import { Button } from "@/shared/ui/Button";
import { DataTable, type DataColumn } from "@/shared/ui/DataTable";
import { IconButton } from "@/shared/ui/IconButton";
import { Money } from "@/shared/ui/Money";
import { canDecreaseQuantity, lineNetUnitPrice, lineTotal, type OrderLine } from "../domain/order";

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
  confirmingRemoval: string | null;
  onAskRemove: (bookCode: string | null) => void;
  onRemove: (bookCode: string) => void;
  onDecrease: (line: OrderLine) => void;
  onOpenSheet: (line: OrderLine) => void;
}

export function OrderLinesTable({
  lines,
  editing,
  sort,
  onSortChange,
  confirmingRemoval,
  onAskRemove,
  onRemove,
  onDecrease,
  onOpenSheet,
}: OrderLinesTableProps) {
  const columns: DataColumn<OrderLine>[] = [
    { key: "title", header: "Título", sortable: true, hideOnMobile: true, className: "min-w-48", render: (line) => <span className="font-medium text-ink">{line.title}</span> },
    { key: "sku", header: "SKU", sortable: true, render: (line) => <span className="tabular-nums text-ink-muted">{line.bookCode}</span> },
    { key: "isbn", header: "ISBN", sortable: true, render: (line) => <span className="tabular-nums text-ink-muted">{line.isbn}</span> },
    { key: "status", header: "Estado", sortable: true, render: (line) => <AvailabilityPill availability={line.availability} /> },
    { key: "originalDate", header: "Fecha Orig.", sortable: true, render: (line) => <span className="tabular-nums">{formatDate(line.originalDate)}</span> },
    ...(!editing
      ? [{ key: "observation", header: "Observación", sortable: true, render: (line: OrderLine) => <span className="text-xs text-ink-muted">{line.observation ?? "—"}</span> }]
      : []),
    { key: "unitPrice", header: "P. Unit.", sortable: true, align: "right", render: (line) => <Money cents={line.unitPrice} /> },
    { key: "quantity", header: "Cant.", sortable: true, align: "center", render: (line) => <span className="font-semibold tabular-nums">{line.quantity}</span> },
    { key: "bonus", header: "Bonif.", sortable: true, align: "right", render: (line) => <span className="whitespace-nowrap">{formatBonus(line.discountPercent, line.promotionPercent)}</span> },
    { key: "price", header: "Precio", sortable: true, align: "right", render: (line) => <Money cents={lineNetUnitPrice(line)} /> },
    { key: "total", header: "Total", sortable: true, align: "right", render: (line) => <Money cents={lineTotal(line)} className="font-semibold" /> },
    ...(editing
      ? [
          {
            key: "actions",
            header: "Acciones",
            align: "right" as const,
            render: (line: OrderLine) =>
              confirmingRemoval === line.bookCode ? (
                <div role="alertdialog" aria-label="Confirmar quitar" className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <span className="text-xs text-ink">¿Quitar este elemento del pedido?</span>
                  <Button size="sm" variant="danger" onClick={() => onRemove(line.bookCode)}>
                    Sí
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => onAskRemove(null)}>
                    No
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-1">
                  <Button size="sm" variant="danger" onClick={() => onAskRemove(line.bookCode)}>
                    <Trash2 aria-hidden className="size-3.5" />
                    Quitar
                  </Button>
                  {canDecreaseQuantity(line) ? (
                    <IconButton label={`Modificar cantidad de ${line.title}`} icon={<Minus className="size-4" />} onClick={() => onDecrease(line)} />
                  ) : null}
                  <IconButton label={`Ver ficha de ${line.title}`} icon={<FileText className="size-4" />} onClick={() => onOpenSheet(line)} />
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
      empty="Tu pedido no tiene títulos. Buscalos abajo o desde Libros."
    />
  );
}
