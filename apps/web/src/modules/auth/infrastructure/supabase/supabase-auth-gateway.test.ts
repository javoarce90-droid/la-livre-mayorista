import { describe, expect, it, vi } from "vitest";
import { err, ok } from "@/shared/lib/result";
import { SupabaseAuthGateway, type SupabaseAuthClient } from "./supabase-auth-gateway";

function authError(code: string | undefined, status = 400, name = "AuthApiError") {
  return Object.assign(new Error(code ?? "boom"), { code, status, name });
}

function setup(auth: Partial<SupabaseAuthClient["auth"]>) {
  const client = { auth } as SupabaseAuthClient;
  const createClient = vi.fn(async () => client);
  return { gateway: new SupabaseAuthGateway(createClient), createClient };
}

const credentials = { email: "compras@libreria.com", password: "secret" };

describe("SupabaseAuthGateway", () => {
  it("signs in with email and password, creating a client per call", async () => {
    const signInWithPassword = vi.fn(async () => ({ data: {}, error: null }));
    const { gateway, createClient } = setup({ signInWithPassword } as never);

    expect(await gateway.signInWithPassword(credentials)).toEqual(ok(null));
    expect(await gateway.signInWithPassword(credentials)).toEqual(ok(null));
    expect(signInWithPassword).toHaveBeenCalledWith(credentials);
    expect(createClient).toHaveBeenCalledTimes(2);
  });

  it.each([
    [authError("invalid_credentials"), "invalid_credentials"],
    // Not revealing that an invited user has not finished signing up.
    [authError("email_not_confirmed"), "invalid_credentials"],
    [authError("over_request_rate_limit", 429), "rate_limited"],
    [authError(undefined, 429), "rate_limited"],
    [authError("unexpected_failure", 500), "unavailable"],
  ])("maps sign-in error %o to %s", async (error, expected) => {
    const { gateway } = setup({ signInWithPassword: vi.fn(async () => ({ data: {}, error })) } as never);
    expect(await gateway.signInWithPassword(credentials)).toEqual(err(expected));
  });

  it("signs out", async () => {
    const signOut = vi.fn(async () => ({ error: null }));
    const { gateway } = setup({ signOut } as never);
    await gateway.signOut();
    expect(signOut).toHaveBeenCalledOnce();
  });

  it("reads the current user from verified claims and the session access token", async () => {
    const { gateway } = setup({
      getClaims: vi.fn(async () => ({ data: { claims: { sub: "u-1", email: "compras@libreria.com" } }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: { access_token: "jwt" } }, error: null })),
    } as never);

    expect(await gateway.currentUser()).toEqual({ id: "u-1", email: "compras@libreria.com", accessToken: "jwt" });
  });

  it("has no current user without valid claims", async () => {
    const getSession = vi.fn();
    const { gateway } = setup({
      getClaims: vi.fn(async () => ({ data: null, error: authError("bad_jwt") })),
      getSession,
    } as never);

    expect(await gateway.currentUser()).toBeNull();
    expect(getSession).not.toHaveBeenCalled();
  });

  it("requests a recovery email and throws provider failures", async () => {
    const resetPasswordForEmail = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: null, error: authError("over_email_send_rate_limit", 429) });
    const { gateway } = setup({ resetPasswordForEmail } as never);

    await gateway.requestPasswordReset("compras@libreria.com");
    expect(resetPasswordForEmail).toHaveBeenCalledWith("compras@libreria.com");
    await expect(gateway.requestPasswordReset("compras@libreria.com")).rejects.toThrow();
  });

  it("updates the password and maps its errors", async () => {
    const updateUser = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: {}, error: authError("same_password", 422) })
      .mockResolvedValueOnce({ data: {}, error: authError("weak_password", 422) })
      .mockResolvedValueOnce({ data: {}, error: authError("reauthentication_needed", 400) })
      .mockResolvedValueOnce({ data: {}, error: authError(undefined, 400, "AuthSessionMissingError") })
      .mockResolvedValueOnce({ data: {}, error: authError("unexpected_failure", 500) });
    const { gateway } = setup({ updateUser } as never);

    expect(await gateway.updatePassword("nueva-clave")).toEqual(ok(null));
    expect(updateUser).toHaveBeenCalledWith({ password: "nueva-clave" });
    for (const expected of ["same_password", "weak_password", "reauthentication_needed", "not_signed_in", "unavailable"]) {
      expect(await gateway.updatePassword("nueva-clave")).toEqual(err(expected));
    }
  });

  it("verifies email links by token hash", async () => {
    const verifyOtp = vi
      .fn()
      .mockResolvedValueOnce({ data: {}, error: null })
      .mockResolvedValueOnce({ data: {}, error: authError("otp_expired", 403) });
    const { gateway } = setup({ verifyOtp } as never);

    expect(await gateway.verifyEmailLink({ tokenHash: "h", type: "invite" })).toEqual(ok(null));
    expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "h", type: "invite" });
    expect(await gateway.verifyEmailLink({ tokenHash: "h", type: "recovery" })).toEqual(err("invalid_link"));
  });
});
