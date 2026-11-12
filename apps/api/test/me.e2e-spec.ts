import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import type { CryptoKey } from 'jose';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { JoseAccessTokenVerifier } from '../src/customer-auth/access-token-verifier.js';
import {
  ACCESS_TOKEN_VERIFIER,
  CUSTOMER_REPOSITORY,
} from '../src/customer-auth/customer-auth.tokens.js';
import type { Customer } from '../src/customers/domain/customer.js';

const INTERNAL = 'Bearer test-internal-token';
const ISSUER = 'https://project.supabase.co/auth/v1';
const AUTH_USER_ID = '6f1c1d0e-0000-4000-8000-0000000000aa';

const customer: Customer = {
  id: '0b6e1f7a-0000-4000-8000-000000000001',
  authUserId: AUTH_USER_ID,
  email: 'compras@libreria.com',
  businessName: 'Librería del Puerto',
  taxId: '20123456786',
  phone: '+54 11 5555-5555',
  status: 'SUSPENDED',
  createdAt: new Date('2026-11-05T12:00:00Z'),
  updatedAt: new Date('2026-11-05T12:00:00Z'),
};

describe('GET /me (e2e)', () => {
  let app: INestApplication<App>;
  let privateKey: CryptoKey;
  let verifier: JoseAccessTokenVerifier;
  const findByAuthUserId = vi.fn(async (id: string) =>
    id === AUTH_USER_ID ? customer : null,
  );
  const saved = {
    DATABASE_URL: process.env.DATABASE_URL,
    API_INTERNAL_TOKEN: process.env.API_INTERNAL_TOKEN,
  };

  const accessToken = (subject = AUTH_USER_ID) =>
    new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(subject)
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('5m')
      .sign(privateKey);

  beforeAll(async () => {
    // Locally generated key pair: no network, same verification code as production.
    const pair = await generateKeyPair('ES256');
    privateKey = pair.privateKey;
    const jwk = {
      ...(await exportJWK(pair.publicKey)),
      kid: 'test-key',
      alg: 'ES256',
    };
    verifier = new JoseAccessTokenVerifier({
      issuer: ISSUER,
      keys: createLocalJWKSet({ keys: [jwk] }),
    });
  });

  beforeEach(async () => {
    process.env.DATABASE_URL = '';
    process.env.API_INTERNAL_TOKEN = 'test-internal-token';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ACCESS_TOKEN_VERIFIER)
      .useValue(verifier)
      .overrideProvider(CUSTOMER_REPOSITORY)
      .useValue({ findByAuthUserId })
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('returns the signed-in customer', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', INTERNAL)
      .set('X-Customer-Token', await accessToken())
      .expect(200)
      .expect({
        id: customer.id,
        email: 'compras@libreria.com',
        businessName: 'Librería del Puerto',
        taxId: '20123456786',
        phone: '+54 11 5555-5555',
        status: 'SUSPENDED',
      });
  });

  it('requires the internal token first', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('X-Customer-Token', await accessToken())
      .expect(401)
      .expect((res) => expect(res.body.error).toBe('unauthorized'));
  });

  it('rejects a missing or forged customer token with 401', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', INTERNAL)
      .expect(401)
      .expect((res) => expect(res.body.error).toBe('invalid_customer_token'));

    const forged = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'test-key' })
      .setSubject(AUTH_USER_ID)
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setExpirationTime('5m')
      .sign((await generateKeyPair('ES256')).privateKey);
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', INTERNAL)
      .set('X-Customer-Token', forged)
      .expect(401);
  });

  it('answers 403 customer_not_found for a user La Livre never created', async () => {
    await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', INTERNAL)
      .set(
        'X-Customer-Token',
        await accessToken('6f1c1d0e-0000-4000-8000-0000000000bb'),
      )
      .expect(403)
      .expect((res) => expect(res.body.error).toBe('customer_not_found'));
  });
});
