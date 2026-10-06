"use client";

import { useId, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { cx } from "@/shared/ui/cx";
import { Input, Label } from "@/shared/ui/Input";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import type { CatalogFacets } from "../application/catalog-repository";
import { activeFilterCount, NO_FILTERS, type SearchFilters } from "../domain/search-filters";
import { AVAILABILITY_FILTER_OPTIONS, availabilityFilterLabel } from "./messages";

/** `immediate`: discrete choices (select, radio, checkbox) apply at once; typed text waits for a pause. */
export type FilterChange = (next: SearchFilters, options: { immediate: boolean }) => void;

export interface BookFiltersProps {
  value: SearchFilters;
  onChange: FilterChange;
  facets: CatalogFacets;
  disabled?: boolean;
}

/** Presentational: filter panel. Always visible on desktop, collapsible on mobile. */
export function BookFilters({ value, onChange, facets, disabled }: BookFiltersProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const panelId = `${id}-panel`;
  const count = activeFilterCount(value);
  const set = <K extends keyof SearchFilters>(key: K, next: SearchFilters[K], immediate: boolean) =>
    onChange({ ...value, [key]: next }, { immediate });

  return (
    <div className="space-y-3">
      <Button
        variant="secondary"
        size="lg"
        className="w-full lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((current) => !current)}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {count > 0 ? `Filtros (${count})` : "Filtros"}
      </Button>

      <div id={panelId} className={cx(open ? "grid" : "hidden", "gap-x-4 gap-y-4 sm:grid-cols-2 lg:grid lg:grid-cols-4")}>
        <div>
          <Label htmlFor={`${id}-author`}>Autor</Label>
          <Input
            id={`${id}-author`}
            value={value.author}
            placeholder="Ej.: Cortázar"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11"
            onChange={(event) => set("author", event.target.value, false)}
            onKeyDown={(event) => event.key === "Enter" && set("author", event.currentTarget.value, true)}
          />
        </div>

        <div>
          <Label htmlFor={`${id}-publisher`}>Editorial</Label>
          <Input
            id={`${id}-publisher`}
            list={`${id}-publishers`}
            value={value.publisher}
            placeholder="Ej.: Anagrama"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="search"
            className="h-11"
            onChange={(event) => {
              // Picking a suggestion from the datalist is a discrete choice: apply it right away.
              const next = event.target.value;
              set("publisher", next, facets.publishers.includes(next));
            }}
            onKeyDown={(event) => event.key === "Enter" && set("publisher", event.currentTarget.value, true)}
          />
          <datalist id={`${id}-publishers`}>
            {facets.publishers.map((publisher) => (
              <option key={publisher} value={publisher} />
            ))}
          </datalist>
        </div>

        <div>
          <Label htmlFor={`${id}-subject`}>Materia</Label>
          <select
            id={`${id}-subject`}
            value={value.subject}
            disabled={disabled}
            onChange={(event) => set("subject", event.target.value, true)}
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink sm:text-sm focus:border-brand-600 focus:ring-2 focus:ring-brand-100 focus:outline-none disabled:bg-subtle"
          >
            <option value="">Todas</option>
            {facets.subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:bg-subtle">
            <input
              type="checkbox"
              checked={value.promotionOnly}
              disabled={disabled}
              onChange={(event) => set("promotionOnly", event.target.checked, true)}
              className="size-4 accent-brand-600"
            />
            Solo con promoción
          </label>
        </div>

        <div className="sm:col-span-2 lg:col-span-4">
          <p className="mb-1.5 text-sm font-medium text-ink" aria-hidden>
            Disponibilidad
          </p>
          <SegmentedControl
            label="Disponibilidad"
            options={AVAILABILITY_FILTER_OPTIONS}
            value={value.availability}
            disabled={disabled}
            onChange={(next) => set("availability", next, true)}
          />
        </div>
      </div>
    </div>
  );
}

interface Chip {
  key: keyof SearchFilters;
  label: string;
}

function chipsFor(filters: SearchFilters): Chip[] {
  const chips: Chip[] = [];
  if (filters.author.trim()) chips.push({ key: "author", label: `Autor: ${filters.author.trim()}` });
  if (filters.publisher.trim()) chips.push({ key: "publisher", label: `Editorial: ${filters.publisher.trim()}` });
  if (filters.subject) chips.push({ key: "subject", label: `Materia: ${filters.subject}` });
  if (filters.availability !== "all") chips.push({ key: "availability", label: availabilityFilterLabel(filters.availability) });
  if (filters.promotionOnly) chips.push({ key: "promotionOnly", label: "Con promoción" });
  return chips;
}

/** Active filters as removable chips, visible next to the results even when the mobile panel is closed. */
export function ActiveFilterChips({ value, onChange }: { value: SearchFilters; onChange: FilterChange }) {
  const chips = chipsFor(value);
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos" role="group">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          aria-label={`Quitar filtro ${chip.label}`}
          onClick={() => onChange({ ...value, [chip.key]: NO_FILTERS[chip.key] }, { immediate: true })}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 py-1 pr-2 pl-3 text-xs font-medium text-brand-800 hover:bg-brand-100 sm:min-h-8"
        >
          {chip.label}
          <X aria-hidden className="size-3.5" />
        </button>
      ))}
      {chips.length > 1 ? (
        <Button variant="ghost" size="touch" onClick={() => onChange(NO_FILTERS, { immediate: true })}>
          Limpiar filtros
        </Button>
      ) : null}
    </div>
  );
}
