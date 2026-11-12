import type { Result } from "@/shared/lib/result";
import { ok } from "@/shared/lib/result";
import { SET_PASSWORD_PATH, loginNoticePath } from "../domain/auth-paths";
import {
  validateEmail,
  validateLoginInput,
  validateNewPassword,
  type CredentialsError,
  type NewPasswordError,
} from "../domain/credentials";
import { safeRedirectPath } from "../domain/safe-redirect";
import { EMAIL_LINK_TYPES, type AuthGateway, type EmailLinkType, type PasswordUpdateError, type SignInError } from "./auth-gateway";

export type LoginError = CredentialsError | SignInError;
export type ChangePasswordError = NewPasswordError | PasswordUpdateError;

export async function login(
  auth: AuthGateway,
  input: { email: string; password: string },
): Promise<Result<null, LoginError>> {
  const credentials = validateLoginInput(input.email, input.password);
  if (!credentials.ok) return credentials;
  return auth.signInWithPassword(credentials.value);
}

/**
 * Always answers the same once the email is well formed, whether or not an
 * account exists and even when the provider fails, to avoid account enumeration.
 */
export async function requestPasswordReset(
  auth: AuthGateway,
  email: string,
  report: (error: unknown) => void = (error) => console.error("Password reset request failed", error),
): Promise<Result<null, "invalid_email">> {
  const normalized = validateEmail(email);
  if (!normalized.ok) return normalized;
  try {
    await auth.requestPasswordReset(normalized.value);
  } catch (error) {
    report(error);
  }
  return ok(null);
}

export async function changePassword(
  auth: AuthGateway,
  input: { password: string; confirmation: string },
): Promise<Result<null, ChangePasswordError>> {
  const password = validateNewPassword(input.password, input.confirmation);
  if (!password.ok) return password;
  return auth.updatePassword(password.value);
}

function isEmailLinkType(value: unknown): value is EmailLinkType {
  return typeof value === "string" && (EMAIL_LINK_TYPES as readonly string[]).includes(value);
}

/** Verifies an invitation / recovery link and returns where to send the browser next. */
export async function confirmEmailLink(
  auth: AuthGateway,
  params: { tokenHash: string | null; type: string | null; next: string | null },
): Promise<string> {
  const invalid = loginNoticePath("enlace_invalido");
  if (!params.tokenHash || !isEmailLinkType(params.type)) return invalid;
  const verified = await auth.verifyEmailLink({ tokenHash: params.tokenHash, type: params.type });
  return verified.ok ? safeRedirectPath(params.next, SET_PASSWORD_PATH) : invalid;
}
