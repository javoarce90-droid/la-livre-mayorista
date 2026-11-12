import type {
  Customer,
  CustomerStatus,
  NewCustomer,
} from '../domain/customer.js';

/** Customer persistence. Implemented by the Prisma adapter. */
export interface CustomerRepository {
  findByEmail(email: string): Promise<Customer | null>;
  findByAuthUserId(authUserId: string): Promise<Customer | null>;
  /** Creates an ACTIVE customer without an auth user yet. */
  create(customer: NewCustomer): Promise<Customer>;
  linkAuthUser(customerId: string, authUserId: string): Promise<Customer>;
  /** Returns null when no customer has that email. */
  setStatus(email: string, status: CustomerStatus): Promise<Customer | null>;
  /** Every customer, ordered by business name. */
  list(): Promise<Customer[]>;
}
