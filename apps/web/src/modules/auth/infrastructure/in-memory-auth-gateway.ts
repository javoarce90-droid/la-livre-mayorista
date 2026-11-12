import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";
import type { AuthGateway, PasswordUpdateError, SignInError } from "../application/auth-gateway";
import type { UserDirectory } from "../application/user-directory";
import type { Credentials } from "../domain/credentials";
import type { SessionUser, User } from "../domain/user";

/** Where the mock keeps its session (the signed HMAC cookie in the app). */
export interface SessionStore {
  read(): Promise<User | null>;
  start(user: User): Promise<void>;
  end(): Promise<void>;
}

/**
 * Offline fallback used when Supabase is not configured (tests, local demo):
 * a fixed user directory and a stateless signed cookie. Never use in production.
 */
export class InMemoryAuthGateway implements AuthGateway {
  constructor(
    private readonly users: UserDirectory,
    private readonly sessions: SessionStore,
  ) {}

  async signInWithPassword(credentials: Credentials): Promise<Result<null, SignInError>> {
    const user = await this.users.authenticate(credentials);
    if (!user) return err("invalid_credentials");
    await this.sessions.start(user);
    return ok(null);
  }

  signOut(): Promise<void> {
    return this.sessions.end();
  }

  async currentUser(): Promise<SessionUser | null> {
    const user = await this.sessions.read();
    return user ? { id: user.accountId, email: user.email, accessToken: null } : null;
  }

  /** The demo has no email: answering like the real provider keeps the UI identical. */
  async requestPasswordReset(): Promise<void> {}

  async updatePassword(): Promise<Result<null, PasswordUpdateError>> {
    return err("unsupported");
  }

  async verifyEmailLink(): Promise<Result<null, "invalid_link">> {
    return err("invalid_link");
  }
}
