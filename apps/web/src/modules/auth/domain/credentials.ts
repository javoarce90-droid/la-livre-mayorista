import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export type CredentialsError = "invalid_email" | "missing_password";
export type NewPasswordError = "password_too_short" | "password_too_long" | "password_mismatch";

export interface Credentials {
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD_LENGTH = 8;
/** Supabase Auth hashes with bcrypt, which ignores bytes past 72. */
export const MAX_PASSWORD_LENGTH = 72;

export function validateEmail(email: string): Result<string, "invalid_email"> {
  const normalizedEmail = email.trim().toLowerCase();
  return EMAIL_PATTERN.test(normalizedEmail) ? ok(normalizedEmail) : err("invalid_email");
}

export function validateLoginInput(email: string, password: string): Result<Credentials, CredentialsError> {
  const normalizedEmail = validateEmail(email);
  if (!normalizedEmail.ok) return normalizedEmail;
  if (password.length === 0) return err("missing_password");
  return ok({ email: normalizedEmail.value, password });
}

export function validateNewPassword(password: string, confirmation: string): Result<string, NewPasswordError> {
  if (password.length < MIN_PASSWORD_LENGTH) return err("password_too_short");
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_LENGTH) return err("password_too_long");
  if (password !== confirmation) return err("password_mismatch");
  return ok(password);
}
