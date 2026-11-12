import { describe, expect, it, vi } from "vitest";
import { err, ok } from "@/shared/lib/result";
import type { AuthGateway } from "./auth-gateway";
import { changePassword, confirmEmailLink, login, requestPasswordReset } from "./auth-use-cases";

function gateway(overrides: Partial<AuthGateway> = {}): AuthGateway {
  return {
    signInWithPassword: vi.fn(async () => ok(null)),
    signOut: vi.fn(async () => {}),
    currentUser: vi.fn(async () => null),
    requestPasswordReset: vi.fn(async () => {}),
    updatePassword: vi.fn(async () => ok(null)),
    verifyEmailLink: vi.fn(async () => ok(null)),
    ...overrides,
  };
}

describe("login", () => {
  it("signs in with the normalized email", async () => {
    const auth = gateway();
    expect(await login(auth, { email: " Demo@LaLivre.com ", password: "secret" })).toEqual(ok(null));
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "demo@lalivre.com", password: "secret" });
  });

  it("returns the provider error", async () => {
    const auth = gateway({ signInWithPassword: vi.fn(async () => err("rate_limited" as const)) });
    expect(await login(auth, { email: "demo@lalivre.com", password: "x" })).toEqual(err("rate_limited"));
  });

  it("rejects malformed input before calling the provider", async () => {
    const auth = gateway();
    expect(await login(auth, { email: "x", password: "" })).toEqual(err("invalid_email"));
    expect(await login(auth, { email: "a@b.com", password: "" })).toEqual(err("missing_password"));
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset", () => {
  it("asks the provider for a recovery email", async () => {
    const auth = gateway();
    expect(await requestPasswordReset(auth, "Compras@Libreria.com")).toEqual(ok(null));
    expect(auth.requestPasswordReset).toHaveBeenCalledWith("compras@libreria.com");
  });

  it("answers the same when the provider fails, so accounts cannot be enumerated", async () => {
    const report = vi.fn();
    const auth = gateway({
      requestPasswordReset: vi.fn(async () => {
        throw new Error("rate limited");
      }),
    });
    expect(await requestPasswordReset(auth, "a@b.com", report)).toEqual(ok(null));
    expect(report).toHaveBeenCalledOnce();
  });

  it("rejects a malformed email", async () => {
    const auth = gateway();
    expect(await requestPasswordReset(auth, "nope")).toEqual(err("invalid_email"));
    expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  });
});

describe("changePassword", () => {
  it("updates the password once validated", async () => {
    const auth = gateway();
    expect(await changePassword(auth, { password: "nueva-clave", confirmation: "nueva-clave" })).toEqual(ok(null));
    expect(auth.updatePassword).toHaveBeenCalledWith("nueva-clave");
  });

  it("validates before calling the provider", async () => {
    const auth = gateway();
    expect(await changePassword(auth, { password: "corta", confirmation: "corta" })).toEqual(err("password_too_short"));
    expect(await changePassword(auth, { password: "nueva-clave", confirmation: "otra-clave" })).toEqual(
      err("password_mismatch"),
    );
    expect(auth.updatePassword).not.toHaveBeenCalled();
  });

  it("returns the provider error", async () => {
    const auth = gateway({ updatePassword: vi.fn(async () => err("same_password" as const)) });
    expect(await changePassword(auth, { password: "nueva-clave", confirmation: "nueva-clave" })).toEqual(
      err("same_password"),
    );
  });
});

describe("confirmEmailLink", () => {
  it("verifies an invitation and continues to the safe next path", async () => {
    const auth = gateway();
    const path = await confirmEmailLink(auth, { tokenHash: "h", type: "invite", next: "/cuenta/clave" });
    expect(path).toBe("/cuenta/clave");
    expect(auth.verifyEmailLink).toHaveBeenCalledWith({ tokenHash: "h", type: "invite" });
  });

  it("defaults to the set-password page and ignores external next values", async () => {
    const auth = gateway();
    expect(await confirmEmailLink(auth, { tokenHash: "h", type: "recovery", next: null })).toBe("/cuenta/clave");
    expect(await confirmEmailLink(auth, { tokenHash: "h", type: "recovery", next: "https://evil.com" })).toBe(
      "/cuenta/clave",
    );
  });

  it("sends invalid, expired or unsupported links to the login with a notice", async () => {
    const expired = gateway({ verifyEmailLink: vi.fn(async () => err("invalid_link" as const)) });
    expect(await confirmEmailLink(expired, { tokenHash: "h", type: "invite", next: null })).toBe(
      "/login?error=enlace_invalido",
    );

    const auth = gateway();
    expect(await confirmEmailLink(auth, { tokenHash: null, type: "invite", next: null })).toBe(
      "/login?error=enlace_invalido",
    );
    expect(await confirmEmailLink(auth, { tokenHash: "h", type: "signup", next: null })).toBe(
      "/login?error=enlace_invalido",
    );
    expect(auth.verifyEmailLink).not.toHaveBeenCalled();
  });
});
