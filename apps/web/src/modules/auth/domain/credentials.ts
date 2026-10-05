import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";

export type CredentialsError = "invalid_email" | "missing_password";

export interface Credentials {
  email: string;
  password: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLoginInput(email: string, password: string): Result<Credentials, CredentialsError> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!EMAIL_PATTERN.test(normalizedEmail)) return err("invalid_email");
  if (password.length === 0) return err("missing_password");
  return ok({ email: normalizedEmail, password });
}
