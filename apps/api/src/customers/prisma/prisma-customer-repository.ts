import { Prisma } from '../../generated/prisma/client.js';
import type { PrismaClient } from '../../generated/prisma/client.js';
import type {
  Customer,
  CustomerStatus,
  NewCustomer,
} from '../domain/customer.js';
import type { CustomerRepository } from '../ports/customer-repository.js';

type CustomerClient = Pick<PrismaClient, 'customer'>;

/** Prisma error code for "record to update not found". */
const RECORD_NOT_FOUND = 'P2025';

/** Prisma adapter of the customer repository. */
export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prisma: CustomerClient) {}

  findByEmail(email: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { email } });
  }

  findByAuthUserId(authUserId: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({ where: { authUserId } });
  }

  create(customer: NewCustomer): Promise<Customer> {
    return this.prisma.customer.create({ data: { ...customer } });
  }

  linkAuthUser(customerId: string, authUserId: string): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { authUserId },
    });
  }

  async setStatus(
    email: string,
    status: CustomerStatus,
  ): Promise<Customer | null> {
    try {
      return await this.prisma.customer.update({
        where: { email },
        data: { status },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === RECORD_NOT_FOUND
      ) {
        return null;
      }
      throw error;
    }
  }

  list(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      orderBy: [{ businessName: 'asc' }, { email: 'asc' }],
    });
  }
}
