import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./session-token";

const secret = "test-secret";
const payload = { email: "demo@lalivre.com", accountId: "acc-1", name: "Demo" };

describe("session token", () => {
  it("round-trips a signed payload", () => {
    const token = signSessionToken(payload, secret, { now: 1_000, ttlSeconds: 60 });
    expect(verifySessionToken(token, secret, { now: 2_000 })).toEqual(payload);
  });

  it("rejects tampered tokens", () => {
    const token = signSessionToken(payload, secret, { now: 1_000, ttlSeconds: 60 });
    const [body, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...payload, email: "evil@x.com", exp: 9e12 })).toString("base64url");
    expect(verifySessionToken(`${forged}.${signature}`, secret, { now: 2_000 })).toBeNull();
    expect(verifySessionToken(`${body}.AAAA`, secret, { now: 2_000 })).toBeNull();
  });

  it("rejects tokens signed with another secret", () => {
    const token = signSessionToken(payload, "other", { now: 1_000, ttlSeconds: 60 });
    expect(verifySessionToken(token, secret, { now: 2_000 })).toBeNull();
  });

  it("rejects expired tokens", () => {
    const token = signSessionToken(payload, secret, { now: 1_000, ttlSeconds: 1 });
    expect(verifySessionToken(token, secret, { now: 5_000 })).toBeNull();
  });

  it("rejects garbage", () => {
    expect(verifySessionToken("garbage", secret)).toBeNull();
    expect(verifySessionToken("", secret)).toBeNull();
  });
});
