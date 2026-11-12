"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/shared/ui/Button";
import { Input, Label } from "@/shared/ui/Input";
import { Notice } from "@/shared/ui/Notice";
import { LOGIN_PATH } from "../domain/auth-paths";
import { requestPasswordResetAction, type ForgotPasswordFormState } from "./actions";
import { AUTH_LINK_CLASSES } from "./AuthLayout";
import { RESET_REQUESTED_MESSAGE } from "./messages";

const INITIAL: ForgotPasswordFormState = { error: null, sent: false, email: "" };

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, INITIAL);

  return (
    <div className="space-y-4">
      {state.sent ? (
        <Notice title="Revisá tu email">{RESET_REQUESTED_MESSAGE}</Notice>
      ) : (
        <form action={formAction} className="space-y-4" noValidate>
          {state.error ? <Notice tone="danger">{state.error}</Notice> : null}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              defaultValue={state.email}
              placeholder="tu@libreria.com"
            />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Enviando…" : "Enviar enlace"}
          </Button>
        </form>
      )}
      <p className="text-center">
        <Link href={LOGIN_PATH} className={AUTH_LINK_CLASSES}>
          Volver a iniciar sesión
        </Link>
      </p>
    </div>
  );
}
