import { createHmac, timingSafeEqual } from "node:crypto";
import type { User } from "../domain/user";

interface TokenClock {
  now?: number;
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** `base64url(json).hmac` — stateless, tamper-proof session cookie value. */
export function signSessionToken(
  user: User,
  secret: string,
  { now = Date.now(), ttlSeconds }: TokenClock & { ttlSeconds: number },
): string {
  const body = Buffer.from(JSON.stringify({ ...user, exp: now + ttlSeconds * 1000 })).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySessionToken(token: string, secret: string, { now = Date.now() }: TokenClock = {}): User | null {
  const [body, signature, ...rest] = token.split(".");
  if (!body || !signature || rest.length > 0) return null;
  const expected = Buffer.from(sign(body, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const { email, name, accountId, exp } = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (typeof exp !== "number" || exp < now) return null;
    if (typeof email !== "string" || typeof name !== "string" || typeof accountId !== "string") return null;
    return { email, name, accountId };
  } catch {
    return null;
  }
}
