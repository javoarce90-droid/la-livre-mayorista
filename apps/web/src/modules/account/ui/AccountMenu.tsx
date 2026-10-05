"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "@/modules/auth/ui/actions";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

export function AccountMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menú de la cuenta"
        onClick={() => setOpen((value) => !value)}
        className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
      >
        {initials(name) || "LL"}
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-ink">{name}</p>
            <p className="truncate text-xs text-ink-muted">{email}</p>
          </div>
          <div className="my-1 border-t border-line" />
          <form action={logoutAction}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger-700 hover:bg-danger-50"
            >
              <LogOut aria-hidden className="size-4" />
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
