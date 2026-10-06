"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Undo2, Upload, X } from "lucide-react";
import type { BookView } from "@/modules/catalog/application/book-view";
import { searchBooksAction } from "@/modules/catalog/ui/actions";
import { BookSheet } from "@/modules/catalog/ui/BookSheet";
import { SearchBox } from "@/modules/catalog/ui/SearchBox";
import type { DeliveryZone } from "@/modules/account/domain/account";
import { isoDate } from "@/shared/lib/dates";
import { formatDate } from "@/shared/lib/format";
import { nextSort, type SortState } from "@/shared/lib/sort";
import { Button, buttonClasses } from "@/shared/ui/Button";
import { Card, CardBody } from "@/shared/ui/Card";
import { IconButton } from "@/shared/ui/IconButton";
import { Modal } from "@/shared/ui/Modal";
import { Money } from "@/shared/ui/Money";
import { Notice } from "@/shared/ui/Notice";
import { buildOrderLine } from "../application/order-context";
import type { ImportPreview } from "../application/preview-import";
import {
  addLine,
  diffOrder,
  hasChanges,
  orderTotals,
  removeLine,
  restoreLine,
  setLineQuantity,
  type OrderLine,
  type OrderTotals,
} from "../domain/order";
import { saveOrderAction } from "./actions";
import type { AddHandler } from "./AddToOrderFlow";
import { AddBooksModal } from "./AddBooksModal";
import { DispatchReviewModal } from "./DispatchReviewModal";
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

interface Removed {
  line: OrderLine;
  index: number;
}

interface Dispatched extends OrderTotals {
  titles: number;
}

/** Highest quantity per book that the order screen allows without a new stock check. */
type Ceilings = Record<string, number>;

const ceilingsOf = (lines: readonly OrderLine[]): Ceilings =>
  Object.fromEntries(lines.map((line) => [line.bookCode, line.quantity]));

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function PedidoContainer({ account, order, books: initialBooks }: PedidoContainerProps) {
  const router = useRouter();
  const [saved, setSaved] = useState<OrderLine[]>(order?.lines ?? []);
  const [hasOrder, setHasOrder] = useState(order !== null);
  const [draft, setDraft] = useState<OrderLine[]>(order?.lines ?? []);
  const [ceilings, setCeilings] = useState<Ceilings>(() => ceilingsOf(order?.lines ?? []));
  const [editing, setEditing] = useState(false);
  const [sort, setSort] = useState<SortState<OrderSortKey> | null>(null);
  const [removed, setRemoved] = useState<Removed | null>(null);
  const [sheet, setSheet] = useState<BookView | null>(null);
  const [books, setBooks] = useState(initialBooks);
  const [importOpen, setImportOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [dispatched, setDispatched] = useState<Dispatched | null>(null);
  const [query, setQuery] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [search, setSearch] = useState<SearchState | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saving, startSaving] = useTransition();
  const [searching, startSearching] = useTransition();
  const undoRef = useRef<HTMLButtonElement>(null);
  const successRef = useRef<HTMLHeadingElement>(null);
  const keepEditingRef = useRef<HTMLButtonElement>(null);

  const lines = editing ? draft : saved;
  const totals = orderTotals(lines);
  const diff = diffOrder(saved, draft);
  const dirty = editing && hasChanges(diff);

  // Keyboard users land on "Deshacer" right after removing a row (the row itself is gone).
  useEffect(() => {
    if (removed) undoRef.current?.focus();
  }, [removed]);

  useEffect(() => {
    if (dispatched) successRef.current?.focus();
  }, [dispatched]);

  // Unsaved edits are only in this tab: warn before leaving or reloading.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const rememberBooks = (items: BookView[]) =>
    setBooks((current) => ({ ...current, ...Object.fromEntries(items.map((book) => [book.code, book])) }));

  const raiseCeiling = (bookCode: string, quantity: number) =>
    setCeilings((current) => ({ ...current, [bookCode]: (current[bookCode] ?? 0) + quantity }));

  const startEditing = () => {
    setDraft(saved);
    setCeilings(ceilingsOf(saved));
    setFeedback(null);
    setDispatched(null);
    setRemoved(null);
    setEditing(true);
  };

  const leaveEditing = () => {
    setDraft(saved);
    setRemoved(null);
    setDiscardOpen(false);
    setEditing(false);
  };

  const persist = (dispatch: boolean) => {
    const sending = editing ? draft : saved;
    startSaving(async () => {
      const result = await saveOrderAction({
        lines: sending.map(({ bookCode, quantity }) => ({ bookCode, quantity })),
        dispatch,
      });
      if (!result.ok) {
        if (dispatch) setReviewError(result.message);
        else setFeedback({ tone: "danger", text: `${result.message} Tus cambios siguen acá.` });
        return;
      }
      const nextLines = result.dispatched ? [] : sending;
      setSaved(nextLines);
      setDraft(nextLines);
      setCeilings(ceilingsOf(nextLines));
      setHasOrder(!result.dispatched);
      setEditing(false);
      setRemoved(null);
      setReviewOpen(false);
      if (result.dispatched) {
        setFeedback(null);
        setDispatched({ ...orderTotals(sending), titles: sending.length });
      } else {
        setFeedback({
          tone: "info",
          text:
            account.zone === "Interior"
              ? "Guardamos tu pedido y reservamos el stock disponible. Todavía no se despachó: tocá Revisar y despachar cuando esté listo."
              : "Guardamos tu pedido y reservamos el stock disponible. Viaja en la próxima entrega.",
        });
      }
      router.refresh();
    });
  };

  const openReview = () => {
    setReviewError(null);
    setReviewOpen(true);
  };

  const changeQuantity = (line: OrderLine, quantity: number) => {
    const result = setLineQuantity(draft, line.bookCode, quantity, ceilings[line.bookCode] ?? line.quantity);
    if (!result.ok) return result.error;
    setDraft(result.value);
    return null;
  };

  const remove = (line: OrderLine) => {
    setRemoved({ line, index: draft.findIndex((current) => current.bookCode === line.bookCode) });
    setDraft((current) => removeLine(current, line.bookCode));
  };

  const undoRemove = () => {
    if (!removed) return;
    setDraft((current) => restoreLine(current, removed.line, removed.index));
    setRemoved(null);
  };

  const runSearch = (text: string, offset: number) => {
    startSearching(async () => {
      const response = await searchBooksAction({ query: text, offset });
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
      raiseCeiling(book.code, quantity);
      return { status: "added" };
    };

  const applyImport = (preview: ImportPreview) => {
    setDraft((current) =>
      preview.lines.reduce((accumulated, line) => {
        const result = addLine(accumulated, line);
        return result.ok ? result.value : accumulated;
      }, current),
    );
    preview.lines.forEach((line) => raiseCeiling(line.bookCode, line.quantity));
  };

  const openSheet = (line: OrderLine) => {
    const book = books[line.bookCode];
    if (book) setSheet(book);
  };

  const changeCount = diff.added.length + diff.removed.length + diff.changed.length;

  return (
    <div className="space-y-4">
      {account.orderLocked ? (
        <Notice
          tone="danger"
          title="Pedido bloqueado"
          action={
            <Button size="touch" variant="secondary" onClick={() => router.refresh()}>
              Volver a consultar
            </Button>
          }
        >
          Estamos procesando tu pedido y por ahora no se puede modificar.
        </Notice>
      ) : null}

      {dispatched ? (
        <section role="status" className="rounded-card border border-success-200 bg-success-50 px-4 py-5 sm:px-5">
          <h2 ref={successRef} tabIndex={-1} className="flex items-center gap-2 text-lg font-semibold text-success-800 outline-none">
            <CheckCircle2 aria-hidden className="size-5" />
            Pedido despachado
          </h2>
          <p className="mt-1 text-sm text-ink">
            Despachamos {plural(dispatched.titles, "título", "títulos")} ({plural(dispatched.units, "ejemplar", "ejemplares")}) por{" "}
            <Money cents={dispatched.total} className="font-semibold" />. Lo que tiene stock sale en la próxima entrega; lo que está sin stock o a
            pedido, cuando ingrese.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/libros" className={buttonClasses("primary", "lg")}>
              Empezar un pedido nuevo
            </Link>
            <Link href="/dashboard" className={buttonClasses("secondary", "lg")}>
              Ir al inicio
            </Link>
          </div>
        </section>
      ) : null}

      {feedback ? <Notice tone={feedback.tone === "danger" ? "danger" : "info"}>{feedback.text}</Notice> : null}

      {dispatched ? null : (
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
                {dirty ? (
                  <span className="ml-2 normal-case text-warning-700">
                    · {plural(changeCount, "cambio sin guardar", "cambios sin guardar")}
                  </span>
                ) : null}
              </p>
              {editing ? (
                <Button variant="ghost" size="touch" onClick={() => (dirty ? setDiscardOpen(true) : leaveEditing())} disabled={saving}>
                  {dirty ? "Descartar cambios" : "Salir de edición"}
                </Button>
              ) : null}
            </div>
            {editing ? (
              // Phones get one callout: the stock note folds into the zone notice so the lines stay in view.
              <div className="grid gap-2 lg:grid-cols-2">
                <Notice tone="warning" className="max-md:hidden">
                  El stock se reserva recién cuando guardás. Hasta entonces, los cambios son solo tuyos.
                </Notice>
                {account.zone === "AMBA" ? (
                  <Notice tone="info" title="Zona AMBA" className="max-md:py-2">
                    Con Guardar alcanza: lo que guardes viaja solo en la próxima entrega.
                    <span className="md:hidden"> El stock se reserva al guardar; hasta entonces, los cambios son solo tuyos.</span>
                  </Notice>
                ) : (
                  <Notice tone="warning" title="Guardar no es despachar" className="max-md:py-2">
                    Tu zona es Interior: el pedido queda guardado pero no sale hasta que lo revises y despaches.
                    <span className="md:hidden"> El stock se reserva al guardar; hasta entonces, los cambios son solo tuyos.</span>
                  </Notice>
                )}
              </div>
            ) : null}
          </div>

          {removed ? (
            <div role="status" className="flex flex-wrap items-center gap-2 border-b border-line bg-subtle px-4 py-2 text-sm sm:px-5">
              <span className="min-w-0 flex-1 text-ink">
                Quitaste <span className="font-medium">{removed.line.title}</span> del pedido.
              </span>
              <Button ref={undoRef} size="touch" variant="secondary" onClick={undoRemove}>
                <Undo2 aria-hidden className="size-3.5" />
                Deshacer
              </Button>
              <IconButton label="Cerrar aviso" size="touch" icon={<X className="size-4" />} onClick={() => setRemoved(null)} />
            </div>
          ) : null}

          <OrderLinesTable
            lines={lines}
            editing={editing}
            sort={sort}
            onSortChange={(key) => setSort((current) => nextSort(current, key))}
            maxQuantity={(line) => ceilings[line.bookCode] ?? line.quantity}
            onQuantityChange={changeQuantity}
            onRemove={remove}
            onOpenSheet={openSheet}
          />

          {editing ? (
            <CardBody className="border-t border-line">
              <section aria-labelledby="add-titles" className="rounded-lg border border-line bg-subtle p-3">
                <h3 id="add-titles" className="mb-2 text-sm font-semibold text-ink">
                  Agregar títulos
                </h3>
                <SearchBox
                  inputId="order-search"
                  value={query}
                  onChange={setQuery}
                  onSubmit={() => runSearch(query, 0)}
                  pending={searching}
                  error={searchError}
                  placeholder="Agregar un libro: título, autor o ISBN…"
                  submitVariant="secondary"
                />
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
                  <span>¿Tenés una planilla?</span>
                  <Button size="touch" variant="secondary" onClick={() => setImportOpen(true)} disabled={saving}>
                    <Upload aria-hidden className="size-3.5" />
                    Importar desde archivo
                  </Button>
                </div>
              </section>
            </CardBody>
          ) : null}

          {editing || lines.length > 0 ? (
            <OrderActionBar
              totals={totals}
              lineCount={lines.length}
              savedTotal={dirty ? orderTotals(saved).total : null}
              editing={editing}
              zone={account.zone}
              pending={saving}
              canEdit={!account.orderLocked}
              canDispatch={lines.length > 0 && !account.orderLocked}
              onEdit={startEditing}
              onSave={() => persist(false)}
              onReviewDispatch={openReview}
            />
          ) : (
            <div className="border-t border-line px-4 py-3 sm:px-5">
              <Button size="lg" onClick={startEditing} disabled={account.orderLocked}>
                Modificar
              </Button>
            </div>
          )}
        </Card>
      )}

      {reviewOpen ? (
        <DispatchReviewModal
          lines={lines}
          diff={editing ? diff : diffOrder(saved, saved)}
          zone={account.zone}
          pending={saving}
          error={reviewError}
          onConfirm={() => persist(true)}
          onClose={() => setReviewOpen(false)}
        />
      ) : null}

      {discardOpen ? (
        <Modal
          size="sm"
          title="¿Descartar los cambios?"
          initialFocusRef={keepEditingRef}
          onClose={() => setDiscardOpen(false)}
          footer={
            <>
              <Button ref={keepEditingRef} variant="secondary" onClick={() => setDiscardOpen(false)}>
                Seguir editando
              </Button>
              <Button variant="danger" onClick={leaveEditing}>
                Descartar cambios
              </Button>
            </>
          }
        >
          <p className="text-sm text-ink">
            Vas a perder {plural(changeCount, "cambio", "cambios")} que todavía no guardaste. El pedido vuelve a como estaba la última vez que
            guardaste.
          </p>
        </Modal>
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
