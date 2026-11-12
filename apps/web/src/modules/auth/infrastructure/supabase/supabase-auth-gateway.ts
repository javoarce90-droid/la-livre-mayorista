import type { SupabaseClient } from "@supabase/supabase-js";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";
import type { AuthGateway, EmailLinkType, PasswordUpdateError, SignInError } from "../../application/auth-gateway";
import type { Credentials } from "../../domain/credentials";
import type { SessionUser } from "../../domain/user";

/** The slice of the Supabase client this adapter uses. */
export interface SupabaseAuthClient {
  auth: Pick<
    SupabaseClient["auth"],
    "signInWithPassword" | "signOut" | "getClaims" | "getSession" | "resetPasswordForEmail" | "updateUser" | "verifyOtp"
  >;
}

interface AuthErrorLike {
  code?: string;
  status?: number;
  name?: string;
  message: string;
}

/** Codes that only mean "wrong email or password" from the user's point of view. */
const INVALID_CREDENTIALS = new Set(["invalid_credentials", "email_not_confirmed", "user_banned"]);
const PASSWORD_ERRORS: Partial<Record<string, PasswordUpdateError>> = {
  same_password: "same_password",
  weak_password: "weak_password",
  reauthentication_needed: "reauthentication_needed",
  session_not_found: "not_signed_in",
};

function signInError(error: AuthErrorLike): SignInError {
  if (error.code && INVALID_CREDENTIALS.has(error.code)) return "invalid_credentials";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rate_limited";
  console.error("Supabase sign-in failed", error.code, error.message);
  return "unavailable";
}

function passwordError(error: AuthErrorLike): PasswordUpdateError {
  if (error.name === "AuthSessionMissingError") return "not_signed_in";
  const mapped = error.code ? PASSWORD_ERRORS[error.code] : undefined;
  if (mapped) return mapped;
  console.error("Supabase password update failed", error.code, error.message);
  return "unavailable";
}

/**
 * Supabase Auth adapter (cookie-based SSR session). A new client is created for
 * every call because it is bound to the current request's cookies.
 */
export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly createClient: () => Promise<SupabaseAuthClient>) {}

  async signInWithPassword(credentials: Credentials): Promise<Result<null, SignInError>> {
    const { auth } = await this.createClient();
    const { error } = await auth.signInWithPassword(credentials);
    return error ? err(signInError(error)) : ok(null);
  }

  async signOut(): Promise<void> {
    const { auth } = await this.createClient();
    const { error } = await auth.signOut();
    // The local session cookies are cleared even when the revocation call fails.
    if (error) console.error("Supabase sign-out failed", error.message);
  }

  async currentUser(): Promise<SessionUser | null> {
    const { auth } = await this.createClient();
    // getClaims verifies the JWT signature; never trust getSession alone on the server.
    const { data, error } = await auth.getClaims();
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    const { data: sessionData } = await auth.getSession();
    return {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : "",
      accessToken: sessionData.session?.access_token ?? null,
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { auth } = await this.createClient();
    // The "Reset password" email template builds the link (see README).
    const { error } = await auth.resetPasswordForEmail(email);
    if (error) throw new Error(`Supabase password reset failed: ${error.code ?? error.status} ${error.message}`);
  }

  async updatePassword(password: string): Promise<Result<null, PasswordUpdateError>> {
    const { auth } = await this.createClient();
    const { error } = await auth.updateUser({ password });
    return error ? err(passwordError(error)) : ok(null);
  }

  async verifyEmailLink({ tokenHash, type }: { tokenHash: string; type: EmailLinkType }): Promise<Result<null, "invalid_link">> {
    const { auth } = await this.createClient();
    const { error } = await auth.verifyOtp({ token_hash: tokenHash, type });
    return error ? err("invalid_link") : ok(null);
  }
}
