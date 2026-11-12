import type { Result } from "@/shared/lib/result";
import type { Credentials } from "../domain/credentials";
import type { SessionUser } from "../domain/user";

export type SignInError = "invalid_credentials" | "rate_limited" | "unavailable";

export type PasswordUpdateError =
  | "not_signed_in"
  | "same_password"
  | "weak_password"
  | "reauthentication_needed"
  | "unsupported"
  | "unavailable";

/** Email links La Livre sends: invitation and password recovery. */
export const EMAIL_LINK_TYPES = ["invite", "recovery"] as const;
export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

/**
 * Port: authentication provider (Supabase Auth, or the in-memory mock).
 * Methods that change the session must run in a Server Action or Route Handler.
 */
export interface AuthGateway {
  signInWithPassword(credentials: Credentials): Promise<Result<null, SignInError>>;
  signOut(): Promise<void>;
  /** Verified identity of the current request, or null when signed out. */
  currentUser(): Promise<SessionUser | null>;
  /** Emails a recovery link when the account exists. Throws only on provider failures. */
  requestPasswordReset(email: string): Promise<void>;
  /** Sets the signed-in user's password. */
  updatePassword(password: string): Promise<Result<null, PasswordUpdateError>>;
  /** Exchanges an email link (token hash) for a session. */
  verifyEmailLink(link: { tokenHash: string; type: EmailLinkType }): Promise<Result<null, "invalid_link">>;
}
