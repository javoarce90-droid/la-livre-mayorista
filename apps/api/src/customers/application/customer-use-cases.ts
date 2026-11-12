import type {
  Customer,
  CustomerStatus,
  NewCustomerInput,
} from '../domain/customer.js';
import { normalizeEmail, prepareNewCustomer } from '../domain/customer.js';
import type { AuthAdmin } from '../ports/auth-admin.js';
import type { CustomerRepository } from '../ports/customer-repository.js';

/** Where the web app lets an invited customer choose a password. */
export const SET_PASSWORD_PATH = '/cuenta/clave';

export class CustomerNotFoundError extends Error {
  constructor(readonly email: string) {
    super(`No customer with email ${email}`);
    this.name = 'CustomerNotFoundError';
  }
}

export interface InviteCustomerDeps {
  customers: CustomerRepository;
  authAdmin: AuthAdmin;
  /** Public origin of the web app (WEB_ORIGIN), e.g. https://portal.lalivre.com.ar */
  webOrigin: string;
}

export type InviteOutcome =
  /** New customer, invitation sent. */
  | 'invited'
  /** Existing customer still pending: invitation sent again, data unchanged. */
  | 'resent'
  /** The auth user already has a password: no email sent. */
  | 'already_registered';

export interface InviteCustomerResult {
  outcome: InviteOutcome;
  customer: Customer;
}

/** `${origin}/auth/confirm?next=/cuenta/clave` — the link target of the invitation email. */
export function invitationRedirectUrl(webOrigin: string): string {
  let origin: URL;
  try {
    origin = new URL(webOrigin);
  } catch {
    throw new RangeError(`Invalid web origin: "${webOrigin}"`);
  }
  if (origin.protocol !== 'https:' && origin.protocol !== 'http:') {
    throw new RangeError(`Invalid web origin: "${webOrigin}"`);
  }
  return `${origin.origin}/auth/confirm?next=${SET_PASSWORD_PATH}`;
}

/**
 * Onboards a customer: stores it, then asks the identity provider to email an
 * invitation. The customer is stored first so a failed invitation can simply
 * be retried; running it again for a pending customer re-sends the email.
 * Reusable by the CLI today and by an admin HTTP endpoint later.
 */
export async function inviteCustomer(
  deps: InviteCustomerDeps,
  input: NewCustomerInput,
): Promise<InviteCustomerResult> {
  const data = prepareNewCustomer(input);
  const redirectTo = invitationRedirectUrl(deps.webOrigin);

  const existing = await deps.customers.findByEmail(data.email);
  let customer = existing ?? (await deps.customers.create(data));

  const invitation = await deps.authAdmin.inviteUserByEmail(customer.email, {
    redirectTo,
  });
  if (invitation.authUserId && customer.authUserId !== invitation.authUserId) {
    customer = await deps.customers.linkAuthUser(
      customer.id,
      invitation.authUserId,
    );
  }

  const outcome: InviteOutcome =
    invitation.status === 'already_registered'
      ? 'already_registered'
      : existing
        ? 'resent'
        : 'invited';
  return { outcome, customer };
}

/** Suspends or re-activates a customer. Suspended customers can sign in but not order. */
export async function setCustomerStatus(
  customers: CustomerRepository,
  email: string,
  status: CustomerStatus,
): Promise<Customer> {
  const normalized = normalizeEmail(email);
  const customer = await customers.setStatus(normalized, status);
  if (!customer) throw new CustomerNotFoundError(normalized);
  return customer;
}

export function listCustomers(
  customers: CustomerRepository,
): Promise<Customer[]> {
  return customers.list();
}
