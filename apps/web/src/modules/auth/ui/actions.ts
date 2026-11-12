"use server";

import { redirect } from "next/navigation";
import { container } from "@/composition";
import { HOME_PATH } from "@/modules/account/domain/portal-sections";
import { changePassword, login, requestPasswordReset } from "../application/auth-use-cases";
import { LOGIN_PATH, SET_PASSWORD_PATH } from "../domain/auth-paths";
import { safeRedirectPath } from "../domain/safe-redirect";
import { changePasswordErrorMessage, loginErrorMessage } from "./messages";

export interface LoginFormState {
  error: string | null;
  email: string;
}

export interface ForgotPasswordFormState {
  error: string | null;
  sent: boolean;
  email: string;
}

export interface SetPasswordFormState {
  error: string | null;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

export async function loginAction(_previous: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = field(formData, "email");
  const result = await login(container().auth, { email, password: field(formData, "password") });
  if (!result.ok) return { error: loginErrorMessage(result.error), email };
  redirect(safeRedirectPath(formData.get("next"), HOME_PATH));
}

export async function logoutAction(): Promise<void> {
  await container().auth.signOut();
  redirect(LOGIN_PATH);
}

/** Always the same confirmation for any well formed email (no account enumeration). */
export async function requestPasswordResetAction(
  _previous: ForgotPasswordFormState,
  formData: FormData,
): Promise<ForgotPasswordFormState> {
  const email = field(formData, "email");
  const result = await requestPasswordReset(container().auth, email);
  if (!result.ok) return { error: loginErrorMessage(result.error), sent: false, email };
  return { error: null, sent: true, email };
}

export async function setPasswordAction(_previous: SetPasswordFormState, formData: FormData): Promise<SetPasswordFormState> {
  const { auth } = container();
  if (!(await auth.currentUser())) redirect(`${LOGIN_PATH}?next=${encodeURIComponent(SET_PASSWORD_PATH)}`);
  const result = await changePassword(auth, {
    password: field(formData, "password"),
    confirmation: field(formData, "confirmation"),
  });
  if (!result.ok) return { error: changePasswordErrorMessage(result.error) };
  redirect(HOME_PATH);
}
