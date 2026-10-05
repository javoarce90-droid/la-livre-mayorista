"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BookView } from "@/modules/catalog/application/book-view";
import { searchBooksAction } from "@/modules/catalog/ui/actions";
import { BookSheet } from "@/modules/catalog/ui/BookSheet";
import { SearchBox } from "@/modules/catalog/ui/SearchBox";
import type { DeliveryZone } from "@/modules/account/domain/account";
import { isoDate } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format";
import { nextSort, type SortState } from "@/shared/lib/sort";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody } from "@/shared/ui/Card";
import { Money } from "@/shared/ui/Money";
import { Notice } from "@/shared/ui/Notice";
import { StatTile } from "@/shared/ui/StatTile";
import { buildOrderLine } from "../application/order-context";
import type { ImportPreview } from "../application/preview-import";
import { addLine, orderTotals, removeLine, type OrderLine } from "../domain/order";
import { saveOrderAction } from "./actions";
import type { AddHandler } from "./AddToOrderFlow";
import { AddBooksModal } from "./AddBooksModal";
import { DecreaseQuantityModal } from "./DecreaseQuantityModal";
import { ImportOrderModal } from "./ImportOrderModal";
import { OrderActionBar } from "./OrderActionBar";
import { OrderLinesTable, type OrderSortKey } from "./OrderLinesTable";

export interface PedidoAccount {
  bookstoreName: string;
  branch: string;
  deposit: string;
  rubro: string;
  email: string;
  zone: DeliveryZone;
  discountPercent: number;
  suspended: boolean;
  orderLocked: boolean;
}

export interface PedidoContainerProps {
  account: PedidoAccount;
  /** null when there is no open order. */
  order: { createdAt: string; lines: OrderLine[] } | null;
  /** Books already in the order, for "Ver ficha". */
  books: Record<string, BookView>;
}

interface SearchState {
  query: string;
  items: BookView[];
  nextOffset: number | null;
}

type Feedback = { tone: "info" | "danger"; text: string } | null;

function sameLines(a: readonly OrderLine[], b: readonly OrderLine[]): boolean {
  return a.length === b.length && a.every((line, index) => line.bookCode === b[index].bookCode && line.quantity === b[index].quantity);
}

export function PedidoContainer({ account, order, books: initialBooks }: PedidoContainerProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<OrderLine[]>(order?.lines ?? []);
  const [hasOrder, setHasOrder] = useState(order !== null);
  const [draft, setDraft] = useState<OrderLine[]>(order?.lines ?? []);
  const [editing, setEditing] = useState(false);
  const [sort, setSort] = useState<SortState<OrderSortKey> | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);
  const [decreasing, setDecreasing] = useState<OrderLine | null>(null);
  const [sheet, setSheet] = useState<BookView | null>(null);
  const [books, setBooks] = useState(initialBooks);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchState | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, startSaving] = useTransition();
  const [searching, startSearching] = useTransition();

  const lines = editing ? draft : saved;
  const totals = orderTotals(lines);
  const dirty = !sameLines(draft, saved);

  const rememberBooks = (items: BookView[]) =>
    setBooks((current) => ({ ...current, ...Object.fromEntries(items.map((book) => [book.code, book])) }));

  const startEditing = () => {
    setDraft(saved);
    setFeedback(null);
    setEditing(true);
  };

  const cancelEditing = () => {
    setDraft(saved);
    setConfirmingRemoval(null);
    setEditing(false);
  };

  const persist = (dispatch: boolean) => {
    startSaving(async () => {
      const result = await saveOrderAction({
        lines: draft.map(({ bookCode, quantity }) => ({ bookCode, quantity })),
        dispatch,
      });
      if (!result.ok) {
        setFeedback({ tone: "danger", text: result.message });
        return;
      }
      const nextLines = result.dispatched ? [] : draft;
      setSaved(nextLines);
      setDraft(nextLines);
      setHasOrder(!result.dispatched);
      setEditing(false);
      setConfirmingRemoval(null);
      setFeedback({
        tone: "info",
        text: result.dispatched ? "¡Listo! Tu pedido fue despachado." : "Guardamos tu pedido y reservamos el stock disponible.",
      });
      router.refresh();
    });
  };

  const runSearch = (text: string, offset: number) => {
    startSearching(async () => {
      const response = await searchBooksAction({ query: text, availability: "all", offset });
      if (!response.ok) {
        setSearchError(response.message);
        return;
      }
      setSearchError(null);
      rememberBooks(response.items);
      setSearch((previous) => ({
        query: text,
        items: offset > 0 && previous ? [...previous.items, ...response.items] : response.items,
        nextOffset: response.nextOffset,
      }));
    });
  };

  const addToDraft =
    (book: BookView): AddHandler =>
    (quantity, confirmUnavailable) => {
      if (book.availability !== "immediate" && !confirmUnavailable) return { status: "needs_confirmation" };
      const line = buildOrderLine(book, account.discountPercent, quantity, isoDate());
      if (!addLine([], line).ok) return { status: "error", error: "invalid_quantity" };
      setDraft((current) => {
        const result = addLine(current, line);
        return result.ok ? result.value : current;
      });
      return { status: "added" };
    };

  const applyImport = (preview: ImportPreview) => {
    setDraft((current) =>
      preview.lines.reduce((accumulated, line) => {
        const result = addLine(accumulated, line);
        return result.ok ? result.value : accumulated;
      }, current),
    );
  };

  const openSheet = (line: OrderLine) => {
    const book = books[line.bookCode];
    if (book) setSheet(book);
  };

  const actionBar = (
    <OrderActionBar
      editing={editing}
      pending={saving}
      canEdit={!account.orderLocked}
      canDispatch={draft.length > 0}
      onEdit={startEditing}
      onSave={() => persist(false)}
      onSaveAndDispatch={() => persist(true)}
      onImport={() => setImportOpen(true)}
      onCancel={cancelEditing}
    />
  );

  return (
    <div className="space-y-4">
      {account.orderLocked ? (
        <Notice
          tone="danger"
          title="Pedido bloqueado"
          action={
            <Button size="sm" variant="secondary" onClick={() => router.refresh()}>
              Volver a consultar
            </Button>
          }
        >
          Estamos procesando tu pedido y por ahora no se puede modificar.
        </Notice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:max-w-xl">
        <StatTile size="lg" label="Total del pedido" value={<Money cents={totals.total} />} />
        <StatTile size="lg" label="Total disponible" value={<Money cents={totals.available} className="text-ink-muted" />} />
      </div>

      {feedback ? <Notice tone={feedback.tone === "danger" ? "danger" : "info"}>{feedback.text}</Notice> : null}

      <Card>
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="font-semibold text-ink">
              {account.bookstoreName} — {account.branch}
            </h2>
            <p className="text-xs text-ink-muted">
              {account.deposit} · Rubro: {account.rubro} · {account.email}
            </p>
          </div>
          <p className="text-xs text-ink-muted">
            {hasOrder && order ? `Fecha del pedido: ${formatDate(order.createdAt)}` : "Sin pedido abierto"}
          </p>
        </header>

        <div className="space-y-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium tracking-wide text-ink-muted uppercase">
              {editing ? "Modo edición" : "Modo consulta"}
              {editing && dirty ? <span className="ml-2 normal-case text-warning-700">· Cambios sin guardar</span> : null}
            </p>
          </div>
          {actionBar}
          {editing ? (
            <div className="grid gap-2 lg:grid-cols-2">
              <Notice tone="warning">El stock se reserva recién cuando guardás. Hasta entonces, los cambios son solo tuyos.</Notice>
              {account.zone === "AMBA" ? (
                <Notice tone="info" title="Zona AMBA">
                  Con Guardar alcanza: lo que guardes viaja solo en la próxima entrega.
                </Notice>
              ) : (
                <Notice tone="warning" title="Guardar no es despachar">
                  Tu zona es Interior: el pedido queda guardado pero no sale hasta que toques Guardar y Despachar.
                </Notice>
              )}
            </div>
          ) : null}
        </div>

        <OrderLinesTable
          lines={lines}
          editing={editing}
          sort={sort}
          onSortChange={(key) => setSort((current) => nextSort(current, key))}
          confirmingRemoval={confirmingRemoval}
          onAskRemove={setConfirmingRemoval}
          onRemove={(bookCode) => {
            setDraft((current) => removeLine(current, bookCode));
            setConfirmingRemoval(null);
          }}
          onDecrease={setDecreasing}
          onOpenSheet={openSheet}
        />

        {editing ? (
          <CardBody className="space-y-4 border-t border-line">
            <div className="rounded-lg border border-line bg-subtle p-3">
              <SearchBox
                inputId="order-search"
                value={query}
                onChange={setQuery}
                onSubmit={() => runSearch(query, 0)}
                pending={searching}
                error={searchError}
                placeholder="Agregar un libro al pedido… (ej.: TCASA)"
              />
            </div>
            {actionBar}
          </CardBody>
        ) : null}
      </Card>

      {decreasing ? (
        <DecreaseQuantityModal
          line={decreasing}
          lines={draft}
          onClose={() => setDecreasing(null)}
          onConfirm={(next) => {
            setDraft(next);
            setDecreasing(null);
          }}
        />
      ) : null}

      {sheet ? <BookSheet key={sheet.code} book={sheet} onClose={() => setSheet(null)} /> : null}

      {search ? (
        <AddBooksModal
          query={search.query}
          books={search.items}
          hasMore={search.nextOffset !== null}
          pending={searching}
          suspended={account.suspended}
          onLoadMore={() => runSearch(search.query, search.nextOffset ?? 0)}
          onAdd={addToDraft}
          onClose={() => setSearch(null)}
        />
      ) : null}

      {importOpen ? <ImportOrderModal onClose={() => setImportOpen(false)} onImported={applyImport} /> : null}
    </div>
  );
}
