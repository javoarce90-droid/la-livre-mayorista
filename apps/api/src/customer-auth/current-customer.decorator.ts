import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Customer } from '../customers/domain/customer.js';
import type { CustomerRequest } from './customer-token.guard.js';

/** The Customer resolved by CustomerTokenGuard. Only valid on guarded routes. */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Customer => {
    const customer = context
      .switchToHttp()
      .getRequest<CustomerRequest>().customer;
    if (!customer) {
      throw new Error(
        'CurrentCustomer used on a route without CustomerTokenGuard',
      );
    }
    return customer;
  },
);
