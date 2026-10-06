"use client";

import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { X } from "lucide-react";
import { cx } from "./cx";
import { IconButton } from "./IconButton";

const SIZES = { sm: "max-w-md", md: "max-w-2xl", lg: "max-w-4xl" } as const;

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[contenteditable='true']",
].join(",");

/**
 * Focuses the first candidate that actually takes focus. Elements hidden with
 * `display: none` (e.g. the desktop copy of a responsive table on phones) refuse
 * focus, so they are skipped without measuring layout.
 */
function focusFirstOf(candidates: HTMLElement[]): boolean {
  for (const element of candidates) {
    element.focus();
    if (document.activeElement === element) return true;
  }
  return false;
}

export interface ModalProps {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Pinned below the scrollable body: on phones it stays inside the thumb zone. */
  footer?: ReactNode;
  /** Extra controls rendered in the header, before the close button. */
  headerActions?: ReactNode;
  size?: keyof typeof SIZES;
  /**
   * Element focused on open instead of the panel. Use it to make the safe
   * choice (e.g. "Volver") the default in confirmations of irreversible actions.
   */
  initialFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * Organism: accessible modal dialog (bottom sheet on phones). Render it conditionally.
 * - Tab / Shift+Tab are trapped inside the panel; focus returns to the trigger on close.
 * - Escape, the × button and the backdrop close it.
 * - The body scrolls with overscroll containment; bottom padding respects the iOS safe area.
 */
export function Modal({ title, onClose, children, footer, headerActions, size = "md", initialFocusRef }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (initialFocusRef?.current ?? panelRef.current)?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // Focus is set once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trapTab = (event: KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const focusables = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) => !element.closest("[inert], [aria-hidden='true']"),
    );
    // Nested dialogs handle their own Tab; the event still bubbles through React.
    event.stopPropagation();
    if (focusables.length === 0) {
      event.preventDefault();
      panel.focus();
      return;
    }
    const active = document.activeElement;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      event.preventDefault();
      focusFirstOf([...focusables].reverse());
    } else if (!event.shiftKey && (active === last || !panel.contains(active))) {
      event.preventDefault();
      focusFirstOf(focusables);
    }
  };

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
          } else if (event.key === "Tab") {
            trapTab(event);
          }
        }}
        className={cx(
          "flex max-h-[92dvh] w-full flex-col rounded-t-2xl bg-surface shadow-xl outline-none sm:rounded-2xl",
          SIZES[size],
        )}
      >
        <header className="flex items-center gap-2 border-b border-line px-4 py-2 sm:gap-3 sm:px-5 sm:py-3">
          <h2 id={titleId} className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
            {title}
          </h2>
          {headerActions}
          <IconButton label="Cerrar" size="touch" icon={<X className="size-5" />} onClick={onClose} />
        </header>
        <div
          className={cx(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5",
            // Without a footer the body is the bottom edge of the sheet: keep it above the home indicator.
            !footer && "pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4",
          )}
        >
          {children}
        </div>
        {footer ? (
          <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-3">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
