import { describe, expect, it } from "vitest";
import { DEMO_CREDENTIALS, InMemoryUserDirectory } from "../infrastructure/in-memory-user-directory";
import { login } from "./login";

const users = new InMemoryUserDirectory();

describe("login", () => {
  it("returns the user for the demo credentials", async () => {
    const result = await login(users, DEMO_CREDENTIALS);
    expect(result.ok && result.value.email).toBe(DEMO_CREDENTIALS.email);
  });

  it("is case-insensitive on the email", async () => {
    const result = await login(users, { ...DEMO_CREDENTIALS, email: DEMO_CREDENTIALS.email.toUpperCase() });
    expect(result.ok).toBe(true);
  });

  it("rejects a wrong password", async () => {
    expect(await login(users, { ...DEMO_CREDENTIALS, password: "nope" })).toEqual({
      ok: false,
      error: "invalid_credentials",
    });
  });

  it("rejects malformed input before checking credentials", async () => {
    expect(await login(users, { email: "x", password: "" })).toEqual({ ok: false, error: "invalid_email" });
  });
});
