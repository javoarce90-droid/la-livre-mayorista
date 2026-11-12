import type { ExecutionContext } from '@nestjs/common';
import {
  ForbiddenException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Customer } from '../customers/domain/customer.js';
import type { CustomerRepository } from '../customers/ports/customer-repository.js';
import type { AccessTokenVerifier } from './access-token-verifier.js';
import {
  AccessTokenVerificationUnavailableError,
  UnconfiguredAccessTokenVerifier,
} from './access-token-verifier.js';
import { CustomerTokenGuard } from './customer-token.guard.js';

const customer: Customer = {
  id: 'cus-1',
  authUserId: 'u-1',
  email: 'compras@libreria.com',
  businessName: 'Librería del Puerto',
  taxId: null,
  phone: null,
  status: 'ACTIVE',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function context(token?: string | string[]) {
  const request: { headers: Record<string, unknown>; customer?: Customer } = {
    headers: { 'x-customer-token': token },
  };
  const ctx = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { ctx, request };
}

const verifier = (
  result: Awaited<ReturnType<AccessTokenVerifier['verify']>>,
) => ({
  verify: vi.fn(async () => result),
});

function customers(found: Customer | null) {
  const findByAuthUserId = vi.fn(async () => found);
  return { findByAuthUserId } as unknown as CustomerRepository & {
    findByAuthUserId: typeof findByAuthUserId;
  };
}

async function errorOf(promise: Promise<unknown>) {
  return promise.then(
    () => null,
    (error: unknown) => error as { getResponse(): { error: string } },
  );
}

describe('CustomerTokenGuard', () => {
  it('resolves the customer of a valid token and attaches it to the request', async () => {
    const tokens = verifier({ userId: 'u-1' });
    const repo = customers(customer);
    const { ctx, request } = context('jwt');

    await expect(
      new CustomerTokenGuard(tokens, repo).canActivate(ctx),
    ).resolves.toBe(true);

    expect(tokens.verify).toHaveBeenCalledWith('jwt');
    expect(repo.findByAuthUserId).toHaveBeenCalledWith('u-1');
    expect(request.customer).toEqual(customer);
  });

  it.each([undefined, '', ['a', 'b']])(
    'rejects a missing or malformed header %o with 401',
    async (header) => {
      const guard = new CustomerTokenGuard(
        verifier({ userId: 'u-1' }),
        customers(customer),
      );
      const error = await errorOf(guard.canActivate(context(header).ctx));
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error?.getResponse().error).toBe('invalid_customer_token');
    },
  );

  it('rejects an invalid token with 401', async () => {
    const guard = new CustomerTokenGuard(verifier(null), customers(customer));
    await expect(guard.canActivate(context('jwt').ctx)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a valid token without a customer with 403 customer_not_found', async () => {
    const guard = new CustomerTokenGuard(
      verifier({ userId: 'u-2' }),
      customers(null),
    );
    const error = await errorOf(guard.canActivate(context('jwt').ctx));
    expect(error).toBeInstanceOf(ForbiddenException);
    expect(error?.getResponse().error).toBe('customer_not_found');
  });

  it('answers 503 when the keys are unavailable or auth is not configured', async () => {
    const unavailable = {
      verify: vi.fn(async () => {
        throw new AccessTokenVerificationUnavailableError(new Error('timeout'));
      }),
    };
    const down = await errorOf(
      new CustomerTokenGuard(unavailable, customers(customer)).canActivate(
        context('jwt').ctx,
      ),
    );
    expect(down).toBeInstanceOf(ServiceUnavailableException);
    expect(down?.getResponse().error).toBe('customer_auth_unavailable');

    const unconfigured = await errorOf(
      new CustomerTokenGuard(
        new UnconfiguredAccessTokenVerifier(),
        customers(customer),
      ).canActivate(context('jwt').ctx),
    );
    expect(unconfigured).toBeInstanceOf(ServiceUnavailableException);
    expect(unconfigured?.getResponse().error).toBe(
      'customer_auth_unconfigured',
    );
  });
});
