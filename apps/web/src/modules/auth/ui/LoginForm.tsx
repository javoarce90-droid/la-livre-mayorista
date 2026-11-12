"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { Input, Label } from "@/shared/ui/Input";
import { Notice } from "@/shared/ui/Notice";
import { FORGOT_PASSWORD_PATH } from "../domain/auth-paths";
import { loginAction, type LoginFormState } from "./actions";
import { AUTH_LINK_CLASSES } from "./AuthLayout";
import { PasswordInput } from "./PasswordInput";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, { error: notice ?? null, email: "" } satisfies LoginFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="username" required defaultValue={state.email} placeholder="tu@libreria.com" />
      </div>
      <div>
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
      <p className="text-center">
        <Link href={FORGOT_PASSWORD_PATH} className={AUTH_LINK_CLASSES}>
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
