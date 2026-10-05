import { Card } from "@/shared/ui/Card";
import { Logo } from "@/shared/ui/brand/Logo";
import { DEMO_CREDENTIALS } from "../infrastructure/in-memory-user-directory";
import { LoginForm } from "./LoginForm";

/** Presentational login page: brand + card + form. */
export function LoginScreen({ next, showDemoHint }: { next?: string; showDemoHint: boolean }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-brand-900 px-4 py-10">
      <div className="mb-8">
        <Logo inverse />
      </div>
      <Card className="w-full max-w-sm">
        <div className="p-6 sm:p-8">
          <h1 className="text-xl font-semibold text-ink">Iniciar sesión</h1>
          <p className="mt-1 mb-6 text-sm text-ink-muted">Ingresá con el email de tu librería.</p>
          <LoginForm next={next} />
          {showDemoHint ? (
            <p className="mt-6 rounded-lg border border-dashed border-line bg-subtle px-3 py-2 text-xs text-ink-muted">
              Demo: <span className="font-medium text-ink">{DEMO_CREDENTIALS.email}</span> /{" "}
              <span className="font-medium text-ink">{DEMO_CREDENTIALS.password}</span>
            </p>
          ) : null}
        </div>
      </Card>
      <p className="mt-6 text-xs text-white/60">Catálogo mayorista de libros</p>
    </main>
  );
}
