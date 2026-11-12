import type { ReactNode } from "react";
import { Card } from "@/shared/ui/Card";
import { Logo } from "@/shared/ui/brand/Logo";

/** Presentational frame shared by the sign-in, password reset and set-password screens. */
export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-brand-900 px-4 py-10">
      <div className="mb-8">
        <Logo inverse />
      </div>
      <Card className="w-full max-w-sm">
        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-ink">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-ink-muted">{description}</p>
          {children}
        </div>
      </Card>
      <p className="mt-6 text-xs text-white/60">Catálogo mayorista de libros</p>
    </main>
  );
}

/** Text link with a 44 px tall hit area (WCAG 2.5.8 with room to spare). */
export const AUTH_LINK_CLASSES =
  "inline-flex min-h-11 items-center text-sm font-medium text-brand-700 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600";
