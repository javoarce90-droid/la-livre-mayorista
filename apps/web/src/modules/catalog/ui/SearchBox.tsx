"use client";

import { useState, type FormEvent } from "react";
import { CircleHelp, Search } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { cx } from "@/shared/ui/cx";
import { criterionLabel } from "../domain/search-query";
import { SearchHelpModal } from "./SearchHelpModal";

export interface SearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  pending?: boolean;
  placeholder?: string;
  error?: string | null;
  inputId?: string;
}

/** Single search input with the "active criterion" chip, Buscar and "? Ayuda". */
export function SearchBox({ value, onChange, onSubmit, pending, placeholder = "Buscá un libro… (ej.: TCASA)", error, inputId = "book-search" }: SearchBoxProps) {
  const [helpOpen, setHelpOpen] = useState(false);
  const label = criterionLabel(value);
  const errorId = `${inputId}-error`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={submit} role="search" className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div
          className={cx(
            "flex h-11 min-w-0 flex-1 items-center rounded-lg border bg-surface focus-within:ring-2",
            error ? "border-danger-600 focus-within:ring-danger-100" : "border-line focus-within:border-brand-600 focus-within:ring-brand-100",
          )}
        >
          <span
            aria-live="polite"
            className={cx(
              "mx-1.5 shrink-0 rounded-md px-2.5 py-1 text-xs font-medium",
              label ? "bg-canvas text-ink" : "bg-canvas text-ink-faint",
            )}
          >
            <span className="sr-only">Criterio activo: </span>
            {label ?? "Criterio"}
          </span>
          <label htmlFor={inputId} className="sr-only">
            Buscar libros
          </label>
          <input
            id={inputId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-full min-w-0 flex-1 bg-transparent pr-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending} className="h-11 flex-1 sm:flex-none">
            <Search aria-hidden className="size-4" />
            {pending ? "Buscando…" : "Buscar"}
          </Button>
          <Button variant="secondary" className="h-11" onClick={() => setHelpOpen(true)}>
            <CircleHelp aria-hidden className="size-4" />
            Ayuda
          </Button>
        </div>
      </div>
      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      ) : null}
      {helpOpen ? <SearchHelpModal onClose={() => setHelpOpen(false)} /> : null}
    </form>
  );
}
