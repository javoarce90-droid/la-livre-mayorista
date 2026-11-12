import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Customer } from '../customers/domain/customer.js';
import type { CustomerRepository } from '../customers/ports/customer-repository.js';
import type { AccessTokenVerifier } from './access-token-verifier.js';
import { AccessTokenVerificationUnconfiguredError } from './access-token-verifier.js';
import {
  ACCESS_TOKEN_VERIFIER,
  CUSTOMER_REPOSITORY,
  CUSTOMER_TOKEN_HEADER,
} from './customer-auth.tokens.js';

export interface CustomerRequest {
  headers: Record<string, unknown>;
  /** Set by CustomerTokenGuard. */
  customer?: Customer;
}

/**
 * Authenticates the end user behind a web server request: verifies the
 * Supabase access token in `X-Customer-Token` and resolves its Customer.
 * Combine it with InternalTokenGuard (listed first) on every route.
 */
@Injectable()
export class CustomerTokenGuard implements CanActivate {
  constructor(
    @Inject(ACCESS_TOKEN_VERIFIER)
    private readonly verifier: AccessTokenVerifier,
    @Inject(CUSTOMER_REPOSITORY) private readonly customers: CustomerRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<CustomerRequest>();
    const token = request.headers[CUSTOMER_TOKEN_HEADER];
    if (typeof token !== 'string' || !token) throw invalidToken();

    const verified = await this.verifier
      .verify(token)
      .catch((error: unknown) => {
        throw error instanceof AccessTokenVerificationUnconfiguredError
          ? new ServiceUnavailableException({
              statusCode: 503,
              error: 'customer_auth_unconfigured',
              message: 'SUPABASE_URL is not configured',
            })
          : new ServiceUnavailableException({
              statusCode: 503,
              error: 'customer_auth_unavailable',
              message: 'Could not verify the customer token right now',
            });
      });
    if (!verified) throw invalidToken();

    const customer = await this.customers.findByAuthUserId(verified.userId);
    if (!customer) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'customer_not_found',
        message: 'The signed-in user has no La Livre customer',
      });
    }
    request.customer = customer;
    return true;
  }
}

function invalidToken(): UnauthorizedException {
  return new UnauthorizedException({
    statusCode: 401,
    error: 'invalid_customer_token',
    message: 'Missing, invalid or expired customer token',
  });
}
