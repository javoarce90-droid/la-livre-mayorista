"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "./cx";
import { IconButton } from "./IconButton";

const SIZES = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" } as const;

export interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Extra controls rendered in the header, before the close button. */
  headerActions?: ReactNode;
  size?: keyof typeof SIZES;
}

/** Organism: accessible modal dialog. Render it conditionally; Escape and backdrop close it. */
export function Modal({ title, onClose, children, footer, headerActions, size = "md" }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.stopPropagation();
            onClose();
          }
        }}
        className={cx(
          "flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-xl outline-none sm:rounded-2xl",
          SIZES[size],
        )}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
            {title}
          </h2>
          {headerActions}
          <IconButton label="Cerrar" icon={<X className="size-5" />} onClick={onClose} />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
        {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-4 py-3 sm:px-5">{footer}</footer> : null}
      </div>
    </div>
  );
}
