"use client";

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { SortState } from "@/shared/lib/sort";
import { cx } from "./cx";

export interface DataColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  /** When present, the header becomes a sort toggle. */
  sortable?: boolean;
  align?: "left" | "right" | "center";
  className?: string;
  /** Hidden in the stacked mobile card. */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  caption: string;
  columns: readonly DataColumn<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  sort?: SortState | null;
  onSortChange?: (key: string) => void;
  onRowClick?: (row: T) => void;
  rowTone?: (row: T) => "danger" | null;
  /** Primary content of each mobile card (title area). */
  renderMobileHeader?: (row: T) => ReactNode;
  empty?: ReactNode;
}

const ALIGN = { left: "text-left", right: "text-right", center: "text-center" } as const;

/** Organism: sortable table on desktop, stacked cards on mobile. */
export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  sort,
  onSortChange,
  onRowClick,
  rowTone,
  renderMobileHeader,
  empty,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <div className="px-4 py-10 text-center text-sm text-ink-muted">{empty ?? "Sin resultados."}</div>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-line text-xs text-ink-muted">
              {columns.map((column) => {
                const active = sort?.key === column.key;
                const SortIcon = !active ? ArrowUpDown : sort?.direction === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined}
                    className={cx("px-3 py-2.5 font-medium whitespace-nowrap", ALIGN[column.align ?? "left"], column.className)}
                  >
                    {column.sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => onSortChange(column.key)}
                        className={cx("inline-flex items-center gap-1 hover:text-ink", active && "text-ink")}
                      >
                        {column.header}
                        <SortIcon aria-hidden className={cx("size-3", !active && "opacity-40")} />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const tone = rowTone?.(row);
              return (
                <tr
                  key={getRowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cx(
                    "border-b border-line last:border-0",
                    onRowClick && "cursor-pointer hover:bg-brand-50/60",
                    tone === "danger" && "bg-danger-50 shadow-[inset_4px_0_0_var(--color-danger-600)]",
                  )}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cx("px-3 py-2.5 align-middle", ALIGN[column.align ?? "left"], column.className)}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-line md:hidden" aria-label={caption}>
        {rows.map((row) => {
          const tone = rowTone?.(row);
          const content = (
            <>
              {renderMobileHeader ? <div className="mb-2">{renderMobileHeader(row)}</div> : null}
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .map((column) => (
                    <div key={column.key} className="min-w-0">
                      <dt className="text-ink-faint">{column.header}</dt>
                      <dd className="truncate text-ink">{column.render(row)}</dd>
                    </div>
                  ))}
              </dl>
            </>
          );
          return (
            <li
              key={getRowKey(row)}
              className={cx("px-4 py-3", tone === "danger" && "border-l-4 border-l-danger-600 bg-danger-50")}
            >
              {onRowClick ? (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => onRowClick(row)}
                  onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && onRowClick(row)}
                  className="block w-full cursor-pointer text-left"
                >
                  {content}
                </div>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
