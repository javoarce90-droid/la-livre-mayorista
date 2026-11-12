import { cookies } from "next/headers";
import type { User } from "../domain/user";
import type { SessionStore } from "./in-memory-auth-gateway";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./session-cookie";
import { signSessionToken, verifySessionToken } from "./session-token";

const DEV_SECRET = "la-livre-dev-only-secret-change-me";

function secret(): string {
  return process.env.SESSION_SECRET ?? DEV_SECRET;
}

/** Signed HMAC session cookie of the in-memory auth fallback. */
export const cookieSessionStore: SessionStore = {
  async read(): Promise<User | null> {
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    return token ? verifySessionToken(token, secret()) : null;
  },

  /** Only callable from Server Actions / Route Handlers. */
  async start(user: User): Promise<void> {
    (await cookies()).set(SESSION_COOKIE, signSessionToken(user, secret(), { ttlSeconds: SESSION_TTL_SECONDS }), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_TTL_SECONDS,
    });
  },

  async end(): Promise<void> {
    (await cookies()).delete(SESSION_COOKIE);
  },
};
