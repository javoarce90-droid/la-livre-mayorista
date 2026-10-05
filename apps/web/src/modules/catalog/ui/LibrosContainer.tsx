"use client";

import { useMemo, useState, useTransition } from "react";
import { addToOrderAction } from "@/modules/order/ui/actions";
import { AddToOrderFlow } from "@/modules/order/ui/AddToOrderFlow";
import { normalizeText } from "@/shared/lib/text";
import { Button } from "@/shared/ui/Button";
import { Card, CardBody, CardHeader } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import type { BookView } from "../application/book-view";
import type { AvailabilityFilter } from "../domain/book";
import { searchBooksAction } from "./actions";
import { BookResultsTable } from "./BookResultsTable";
import { BookSheet } from "./BookSheet";
import { AVAILABILITY_FILTER_OPTIONS } from "./messages";
import { SearchBox } from "./SearchBox";

interface Results {
  query: string;
  items: BookView[];
  total: number;
  nextOffset: number | null;
}

export function LibrosContainer({ suspended }: { suspended: boolean }) {
  const [query, setQuery] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [publisherFilter, setPublisherFilter] = useState("");
  const [selected, setSelected] = useState<BookView | null>(null);
  const [pending, startTransition] = useTransition();

  const runSearch = (text: string, filter: AvailabilityFilter, offset: number) => {
    startTransition(async () => {
      const response = await searchBooksAction({ query: text, availability: filter, offset });
      if (!response.ok) {
        setError(response.message);
        return;
      }
      setError(null);
      setResults((previous) => ({
        query: text,
        items: offset > 0 && previous ? [...previous.items, ...response.items] : response.items,
        total: response.total,
        nextOffset: response.nextOffset,
      }));
      if (offset === 0) setPublisherFilter("");
    });
  };

  const visible = useMemo(() => {
    if (!results) return [];
    const needle = normalizeText(publisherFilter);
    return needle ? results.items.filter((book) => normalizeText(book.publisher).includes(needle)) : results.items;
  }, [results, publisherFilter]);

  return (
    <div className="space-y-4">
      <Card>
        <CardBody>
          <SearchBox
            value={query}
            onChange={setQuery}
            onSubmit={() => runSearch(query, availability, 0)}
            pending={pending}
            error={error}
          />
        </CardBody>
      </Card>

      {results ? (
        <Card>
          <CardHeader
            title="Resultados"
            subtitle={`${results.total} ${results.total === 1 ? "título" : "títulos"} para “${results.query}”`}
          />
          <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              label="Disponibilidad"
              options={AVAILABILITY_FILTER_OPTIONS}
              value={availability}
              disabled={pending}
              onChange={(value) => {
                setAvailability(value);
                runSearch(results.query, value, 0);
              }}
            />
            <div className="w-full lg:w-64">
              <label htmlFor="publisher-filter" className="sr-only">
                Filtrar editorial
              </label>
              <Input
                id="publisher-filter"
                value={publisherFilter}
                onChange={(event) => setPublisherFilter(event.target.value)}
                placeholder="Filtrar editorial…"
                className="h-9"
              />
            </div>
          </div>
          <BookResultsTable books={visible} onOpen={setSelected} />
          {results.nextOffset !== null ? (
            <div className="flex justify-center border-t border-line p-4">
              <Button variant="secondary" disabled={pending} onClick={() => runSearch(results.query, availability, results.nextOffset ?? 0)}>
                {pending ? "Buscando…" : "Buscar más resultados"}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : (
        <p className="px-1 text-sm text-ink-muted">
          Empezá con la letra del criterio y el texto, todo junto: <span className="font-mono text-ink">TCASA</span>,{" "}
          <span className="font-mono text-ink">ABORGES</span> o <span className="font-mono text-ink">+TCUENTOS +AQUIROGA</span>.
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
