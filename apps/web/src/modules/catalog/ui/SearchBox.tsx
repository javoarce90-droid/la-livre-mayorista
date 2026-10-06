"use client";

import { useState, type FormEvent } from "react";
import { CircleHelp, Search } from "lucide-react";
import { Button, type ButtonVariant } from "@/shared/ui/Button";
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
  /** "secondary" when the screen already has its own primary action (e.g. Guardar in Pedido). */
  submitVariant?: ButtonVariant;
}

/**
 * Single search input: plain text by default (title, author, publisher, ISBN).
 * The criterion chip only appears when the input is unambiguous (ISBN, barcode, + shortcut).
 */
export function SearchBox({
  value,
  onChange,
  onSubmit,
  pending,
  placeholder = "Título, autor, editorial o ISBN…",
  error,
  inputId = "book-search",
  submitVariant = "primary",
}: SearchBoxProps) {
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
          <Search aria-hidden className="ml-3 size-4 shrink-0 text-ink-muted" />
          <label htmlFor={inputId} className="sr-only">
            Buscar libros
          </label>
          <input
            id={inputId}
            type="search"
            enterKeyHint="search"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-base text-ink sm:text-sm placeholder:text-ink-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <span aria-live="polite" className="contents">
            {label ? (
              <span className="mr-1.5 shrink-0 rounded-md bg-canvas px-2.5 py-1 text-xs font-medium text-ink">
                <span className="sr-only">Buscando por: </span>
                {label}
              </span>
            ) : null}
          </span>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant={submitVariant} size="lg" disabled={pending} className="flex-1 sm:flex-none">
            <Search aria-hidden className="size-4" />
            {pending ? "Buscando…" : "Buscar"}
          </Button>
          <Button variant="secondary" size="lg" onClick={() => setHelpOpen(true)}>
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
