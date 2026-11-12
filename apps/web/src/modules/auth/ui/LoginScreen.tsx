import { DEMO_CREDENTIALS } from "../infrastructure/in-memory-user-directory";
import { AuthLayout } from "./AuthLayout";
import { LoginForm } from "./LoginForm";

/** Presentational login page: brand + card + form. */
export function LoginScreen({ next, notice, showDemoHint }: { next?: string; notice?: string; showDemoHint: boolean }) {
  return (
    <AuthLayout title="Iniciar sesión" description="Ingresá con el email de tu librería.">
      <LoginForm next={next} notice={notice} />
      {showDemoHint ? (
        <p className="mt-6 rounded-lg border border-dashed border-line bg-subtle px-3 py-2 text-xs text-ink-muted">
          Demo: <span className="font-medium text-ink">{DEMO_CREDENTIALS.email}</span> /{" "}
          <span className="font-medium text-ink">{DEMO_CREDENTIALS.password}</span>
        </p>
      ) : null}
    </AuthLayout>
  );
}
