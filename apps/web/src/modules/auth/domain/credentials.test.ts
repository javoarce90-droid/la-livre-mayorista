import { describe, expect, it } from "vitest";
import { validateLoginInput } from "./credentials";

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
