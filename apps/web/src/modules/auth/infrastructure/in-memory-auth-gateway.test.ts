import { describe, expect, it } from "vitest";
import { err, ok } from "@/shared/lib/result";
import type { AuthGateway } from "../application/auth-gateway";
import type { User } from "../domain/user";
import { InMemoryAuthGateway, type SessionStore } from "./in-memory-auth-gateway";
import { DEMO_CREDENTIALS, InMemoryUserDirectory } from "./in-memory-user-directory";

function memoryStore(): SessionStore & { user: User | null } {
  return {
    user: null,
    async read() {
      return this.user;
    },
    async start(user) {
      this.user = user;
    },
    async end() {
      this.user = null;
    },
  };
}

function setup() {
  const sessions = memoryStore();
  const auth: AuthGateway = new InMemoryAuthGateway(new InMemoryUserDirectory(), sessions);
  return { sessions, auth };
}

describe("InMemoryAuthGateway", () => {
  it("signs the demo user in and out", async () => {
    const { auth, sessions } = setup();

    expect(await auth.signInWithPassword(DEMO_CREDENTIALS)).toEqual(ok(null));
    expect(await auth.currentUser()).toEqual({
      id: sessions.user!.accountId,
      email: DEMO_CREDENTIALS.email,
      accessToken: null,
    });

    await auth.signOut();
    expect(await auth.currentUser()).toBeNull();
  });

  it("rejects a wrong password without starting a session", async () => {
    const { auth, sessions } = setup();
    expect(await auth.signInWithPassword({ ...DEMO_CREDENTIALS, password: "nope" })).toEqual(err("invalid_credentials"));
    expect(sessions.user).toBeNull();
  });

  it("does not support email links or password changes (demo only)", async () => {
    const { auth } = setup();
    await expect(auth.requestPasswordReset(DEMO_CREDENTIALS.email)).resolves.toBeUndefined();
    expect(await auth.updatePassword("nueva-clave")).toEqual(err("unsupported"));
    expect(await auth.verifyEmailLink({ tokenHash: "h", type: "invite" })).toEqual(err("invalid_link"));
  });
});
