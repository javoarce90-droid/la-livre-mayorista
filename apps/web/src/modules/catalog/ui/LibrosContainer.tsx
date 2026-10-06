"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addToOrderAction } from "@/modules/order/ui/actions";
import { AddToOrderFlow } from "@/modules/order/ui/AddToOrderFlow";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Notice } from "@/shared/ui/Notice";
import type { BookView } from "../application/book-view";
import type { CatalogFacets } from "../application/catalog-repository";
import { activeFilterCount, NO_FILTERS, type SearchFilters } from "../domain/search-filters";
import { searchBooksAction } from "./actions";
import { ActiveFilterChips, BookFilters, type FilterChange } from "./BookFilters";
import { BookResultsTable } from "./BookResultsTable";
import { BookSheet } from "./BookSheet";
import { SearchBox } from "./SearchBox";

/** Typed filters (Autor, Editorial) search after this pause; discrete choices search at once. */
const TYPING_DEBOUNCE_MS = 400;

interface Results {
  query: string;
  filters: SearchFilters;
  items: BookView[];
  total: number;
  nextOffset: number | null;
  notice: string | null;
}

function resultsSubtitle({ query, filters, total }: Results): string {
  const count = `${total} ${total === 1 ? "título" : "títulos"}`;
  const forQuery = query ? ` para “${query}”` : "";
  const filterCount = activeFilterCount(filters);
  const withFilters = filterCount > 0 ? ` · ${filterCount} ${filterCount === 1 ? "filtro" : "filtros"}` : "";
  return `${count}${forQuery}${withFilters}`;
}

export function LibrosContainer({ suspended, facets }: { suspended: boolean; facets: CatalogFacets }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS);
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookView | null>(null);
  const [pending, startTransition] = useTransition();
  const queryRef = useRef(query);
  const latestRequest = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTyping = () => {
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = null;
  };

  useEffect(() => cancelTyping, []);

  const runSearch = (text: string, activeFilters: SearchFilters, offset: number) => {
    cancelTyping();
    const requestId = ++latestRequest.current;
    startTransition(async () => {
      const response = await searchBooksAction({ query: text, filters: activeFilters, offset });
      // A newer search (e.g. another filter click) superseded this one: drop the stale response.
      if (requestId !== latestRequest.current) return;
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setError(null);
      setResults((previous) => ({
        query: text.trim(),
        filters: activeFilters,
        items: offset > 0 && previous ? [...previous.items, ...response.items] : response.items,
        total: response.total,
        nextOffset: response.nextOffset,
        notice: response.notice,
      }));
    });
  };

  const changeQuery = (value: string) => {
    queryRef.current = value;
    setQuery(value);
  };

  const changeFilters: FilterChange = (next, { immediate }) => {
    setFilters(next);
    cancelTyping();
    if (queryRef.current.trim() === "" && activeFilterCount(next) === 0) {
      latestRequest.current += 1;
      setResults(null);
      setError(null);
      return;
    }
    if (immediate) runSearch(queryRef.current, next, 0);
    else typingTimer.current = setTimeout(() => runSearch(queryRef.current, next, 0), TYPING_DEBOUNCE_MS);
  };

  const hasFilters = activeFilterCount(filters) > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <SearchBox
            value={query}
            onChange={changeQuery}
            onSubmit={() => runSearch(query, filters, 0)}
            pending={pending}
            error={error}
          />
          <div className="border-t border-line pt-4">
            <BookFilters value={filters} onChange={changeFilters} facets={facets} />
          </div>
        </CardBody>
      </Card>

      {results ? (
        <Card>
          <div aria-busy={pending}>
            <CardHeader
              title="Resultados"
              subtitle={resultsSubtitle(results)}
              actions={
                pending ? (
                  <span role="status" className="text-xs text-ink-muted">
                    Actualizando…
                  </span>
                ) : null
              }
            />
            {hasFilters || results.notice ? (
              <div className="space-y-3 border-b border-line px-4 py-3 sm:px-5">
                <ActiveFilterChips value={filters} onChange={changeFilters} />
                {results.notice ? <Notice tone="info">{results.notice}</Notice> : null}
              </div>
            ) : null}
            <div className={pending ? "opacity-60 transition-opacity motion-reduce:transition-none" : undefined}>
              <BookResultsTable
                books={results.items}
                onOpen={setSelected}
                empty={
                  hasFilters ? (
                    <div className="space-y-3">
                      <p>No hay libros que cumplan todos los filtros. Probá quitando alguno.</p>
                      <Button variant="secondary" size="lg" onClick={() => changeFilters(NO_FILTERS, { immediate: true })}>
                        Limpiar filtros
                      </Button>
                    </div>
                  ) : undefined
                }
              />
            </div>
            {results.items.length > 0 ? (
              <div className="flex flex-col items-center gap-2 border-t border-line p-4">
                <p className="text-xs text-ink-muted tabular-nums">
                  Mostrando {results.items.length} de {results.total}
                </p>
                {results.nextOffset !== null ? (
                  <Button
                    variant="secondary"
                    size="lg"
                    disabled={pending}
                    onClick={() => runSearch(results.query, results.filters, results.nextOffset ?? 0)}
                  >
                    {pending ? "Buscando…" : "Mostrar más resultados"}
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </Card>
      ) : (
        <p className="px-1 text-sm text-ink-muted">
          Escribí lo que sepas, por ejemplo <span className="text-ink">cien años</span> o{" "}
          <span className="text-ink">borges aleph</span>, o elegí filtros para recorrer el catálogo.
        </p>
      )}

      {selected ? (
        <BookSheet
          key={selected.code}
          book={selected}
          onClose={() => setSelected(null)}
          addSlot={
            <AddToOrderFlow
              idPrefix={`sheet-${selected.code}`}
              suspended={suspended}
              onAdd={(quantity, confirmUnavailable) =>
                addToOrderAction({ bookCode: selected.code, quantity, confirmUnavailable })
              }
            />
          }
        />
      ) : null}
    </div>
  );
}
