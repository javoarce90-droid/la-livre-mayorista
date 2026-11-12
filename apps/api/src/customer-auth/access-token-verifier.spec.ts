import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey, JWK } from 'jose';
import {
  AccessTokenVerificationUnavailableError,
  JoseAccessTokenVerifier,
  supabaseAuthIssuer,
} from './access-token-verifier.js';

const ISSUER = 'https://project.supabase.co/auth/v1';

let privateKey: CryptoKey;
let publicJwk: JWK;

beforeAll(async () => {
  const pair = await generateKeyPair('ES256');
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'ES256' };
});

function verifier() {
  return new JoseAccessTokenVerifier({
    issuer: ISSUER,
    keys: createLocalJWKSet({ keys: [publicJwk] }),
  });
}

function token(
  claims: Record<string, unknown> = {},
  {
    key = privateKey,
    issuer = ISSUER,
    audience = 'authenticated',
    expiresIn = '1h',
  }: {
    key?: CryptoKey;
    issuer?: string;
    audience?: string;
    expiresIn?: string;
  } = {},
) {
  return new SignJWT({ role: 'authenticated', ...claims })
    .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
    .setSubject('6f1c1d0e-0000-4000-8000-0000000000aa')
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

describe('supabaseAuthIssuer', () => {
  it('appends /auth/v1 to the project URL', () => {
    expect(supabaseAuthIssuer('https://project.supabase.co/')).toBe(ISSUER);
  });
});

describe('JoseAccessTokenVerifier', () => {
  it('returns the Supabase user id of a valid access token', async () => {
    await expect(verifier().verify(await token())).resolves.toEqual({
      userId: '6f1c1d0e-0000-4000-8000-0000000000aa',
    });
  });

  it('rejects a token from another issuer or audience', async () => {
    expect(
      await verifier().verify(
        await token({}, { issuer: 'https://evil/auth/v1' }),
      ),
    ).toBeNull();
    expect(
      await verifier().verify(await token({}, { audience: 'anon' })),
    ).toBeNull();
  });

  it('rejects an expired token', async () => {
    expect(
      await verifier().verify(await token({}, { expiresIn: '-1m' })),
    ).toBeNull();
  });

  it('rejects a token signed with another key', async () => {
    const other = await generateKeyPair('ES256');
    expect(
      await verifier().verify(await token({}, { key: other.privateKey })),
    ).toBeNull();
  });

  it('rejects garbage and tokens without a subject', async () => {
    expect(await verifier().verify('not-a-jwt')).toBeNull();
    const noSubject = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(privateKey);
    expect(await verifier().verify(noSubject)).toBeNull();
  });

  it('reports an unreachable key set as unavailable, not as an invalid token', async () => {
    const unreachable = new JoseAccessTokenVerifier({
      issuer: ISSUER,
      keys: async () => {
        throw new TypeError('fetch failed');
      },
    });

    await expect(unreachable.verify(await token())).rejects.toThrow(
      AccessTokenVerificationUnavailableError,
    );
  });
});
