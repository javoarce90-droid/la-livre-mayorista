import { createRemoteJWKSet, errors, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';

/** Identity carried by a verified access token. */
export interface VerifiedAccessToken {
  /** Supabase auth.users id (`sub`). */
  userId: string;
}

/** Port: verifies the end-user access token the web app forwards. */
export interface AccessTokenVerifier {
  /**
   * Resolves the identity, or null for an invalid, expired or foreign token.
   * Throws AccessTokenVerificationUnavailableError when keys cannot be fetched.
   */
  verify(token: string): Promise<VerifiedAccessToken | null>;
}

/** The signing keys could not be loaded: not the caller's fault. */
export class AccessTokenVerificationUnavailableError extends Error {
  constructor(cause: unknown) {
    super('Access token keys are unavailable', { cause });
    this.name = 'AccessTokenVerificationUnavailableError';
  }
}

/** Customer authentication is not configured (SUPABASE_URL unset). */
export class AccessTokenVerificationUnconfiguredError extends Error {
  constructor() {
    super('SUPABASE_URL is not configured');
    this.name = 'AccessTokenVerificationUnconfiguredError';
  }
}

/** Audience Supabase Auth sets on signed-in users' access tokens. */
export const SUPABASE_AUDIENCE = 'authenticated';
/** Asymmetric algorithms Supabase signing keys use (ES256 default, RS256). */
const ALGORITHMS = ['ES256', 'RS256'];

/** Errors meaning "could not get the keys", as opposed to "bad token". */
const KEY_SET_FAILURES = [errors.JWKSTimeout, errors.JWKSInvalid];

export function supabaseAuthIssuer(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/auth/v1`;
}

/** Verifies Supabase access tokens (JWT) against a JSON Web Key Set. */
export class JoseAccessTokenVerifier implements AccessTokenVerifier {
  private readonly issuer: string;
  private readonly audience: string;
  private readonly keys: JWTVerifyGetKey;

  constructor(options: {
    issuer: string;
    keys: JWTVerifyGetKey;
    audience?: string;
  }) {
    this.issuer = options.issuer;
    this.audience = options.audience ?? SUPABASE_AUDIENCE;
    this.keys = options.keys;
  }

  async verify(token: string): Promise<VerifiedAccessToken | null> {
    try {
      const { payload } = await jwtVerify(token, this.keys, {
        issuer: this.issuer,
        audience: this.audience,
        algorithms: ALGORITHMS,
      });
      return typeof payload.sub === 'string' && payload.sub
        ? { userId: payload.sub }
        : null;
    } catch (error) {
      const keySetFailure =
        !(error instanceof errors.JOSEError) ||
        KEY_SET_FAILURES.some((type) => error instanceof type);
      if (keySetFailure)
        throw new AccessTokenVerificationUnavailableError(error);
      return null;
    }
  }
}

/** Always fails: used when SUPABASE_URL is not set. */
export class UnconfiguredAccessTokenVerifier implements AccessTokenVerifier {
  verify(): Promise<VerifiedAccessToken | null> {
    return Promise.reject(new AccessTokenVerificationUnconfiguredError());
  }
}

/**
 * Verifier backed by the project's public keys at
 * `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (cached by jose). Requires
 * asymmetric JWT signing keys: the JWKS is empty with the legacy shared secret.
 */
export function createAccessTokenVerifier(
  supabaseUrl: string | undefined,
): AccessTokenVerifier {
  if (!supabaseUrl?.trim()) return new UnconfiguredAccessTokenVerifier();
  const issuer = supabaseAuthIssuer(supabaseUrl.trim());
  return new JoseAccessTokenVerifier({
    issuer,
    keys: createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)),
  });
}
