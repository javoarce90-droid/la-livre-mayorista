import { describe, expect, it } from "vitest";
import { MIN_PASSWORD_LENGTH, validateEmail, validateLoginInput, validateNewPassword } from "./credentials";

describe("validateEmail", () => {
  it("normalizes a well formed email", () => {
    expect(validateEmail(" Compras@Libreria.com ")).toEqual({ ok: true, value: "compras@libreria.com" });
  });

  it("rejects malformed emails", () => {
    expect(validateEmail("compras")).toEqual({ ok: false, error: "invalid_email" });
  });
});

describe("validateNewPassword", () => {
  const strong = "a".repeat(MIN_PASSWORD_LENGTH);

  it("accepts a long enough password confirmed twice", () => {
    expect(validateNewPassword(strong, strong)).toEqual({ ok: true, value: strong });
  });

  it("rejects short passwords", () => {
    expect(validateNewPassword("short", "short")).toEqual({ ok: false, error: "password_too_short" });
  });

  it("rejects passwords longer than the provider accepts", () => {
    const long = "a".repeat(73);
    expect(validateNewPassword(long, long)).toEqual({ ok: false, error: "password_too_long" });
  });

  it("rejects a confirmation that does not match", () => {
    expect(validateNewPassword(strong, `${strong}x`)).toEqual({ ok: false, error: "password_mismatch" });
  });
});

describe("validateLoginInput", () => {
  it("accepts a well formed email and a password, normalizing the email", () => {
    expect(validateLoginInput(" Demo@LaLivre.com ", "secret")).toEqual({
      ok: true,
      value: { email: "demo@lalivre.com", password: "secret" },
    });
  });

  it("rejects malformed emails", () => {
    expect(validateLoginInput("demo", "x")).toEqual({ ok: false, error: "invalid_email" });
  });

  it("rejects empty passwords", () => {
    expect(validateLoginInput("demo@lalivre.com", "")).toEqual({ ok: false, error: "missing_password" });
  });
});
