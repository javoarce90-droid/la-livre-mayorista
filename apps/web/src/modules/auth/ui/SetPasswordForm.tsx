"use client";

import { useActionState } from "react";
import { Button } from "@/shared/ui/Button";
import { Label } from "@/shared/ui/Input";
import { Notice } from "@/shared/ui/Notice";
import { MIN_PASSWORD_LENGTH } from "../domain/credentials";
import { setPasswordAction, type SetPasswordFormState } from "./actions";
import { PasswordInput } from "./PasswordInput";

const INITIAL: SetPasswordFormState = { error: null };

export function SetPasswordForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(setPasswordAction, INITIAL);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {/* Lets password managers store the new password under the right account. */}
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <div>
        <Label htmlFor="password">Contraseña nueva</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="mt-1.5 text-xs text-ink-muted">
          Al menos {MIN_PASSWORD_LENGTH} caracteres.
        </p>
      </div>
      <div>
        <Label htmlFor="confirmation">Repetí la contraseña</Label>
        <PasswordInput id="confirmation" name="confirmation" autoComplete="new-password" required />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : "Guardar contraseña"}
      </Button>
    </form>
  );
}
