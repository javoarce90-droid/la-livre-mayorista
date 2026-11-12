import { parseArgs } from 'node:util';
import {
  inviteCustomer,
  listCustomers,
  setCustomerStatus,
} from '../application/customer-use-cases.js';
import type {
  Customer,
  CustomerStatus,
  NewCustomerInput,
} from '../domain/customer.js';
import { normalizeEmail, prepareNewCustomer } from '../domain/customer.js';
import type { AuthAdmin } from '../ports/auth-admin.js';
import type { CustomerRepository } from '../ports/customer-repository.js';

export interface CustomersCliDependencies {
  stdout: (line: string) => void;
  stderr: (line: string) => void;
  connect: () => Promise<{
    customers: CustomerRepository;
    close: () => Promise<void>;
  }>;
  /** Only the invite command needs Supabase. Throws when it is not configured. */
  createAuthAdmin: () => AuthAdmin;
  /** WEB_ORIGIN; throws when it is not configured. */
  webOrigin: () => string;
}

export const INVITE_USAGE = `Usage: customers:invite -- --email <email> --name <business name> [--tax-id <CUIT>] [--phone <phone>]

Creates the customer (if new) and emails a Supabase invitation to choose a
password. Running it again for a customer that has not accepted yet re-sends it.

  --email <email>    Sign-in email (stored lowercase)
  --name <name>      Business name shown in the portal
  --tax-id <CUIT>    Optional, 11 digits (dashes allowed), check digit validated
  --phone <phone>    Optional`;

const setStatusUsage = (command: string) =>
  `Usage: ${command} -- --email <email>`;

const LIST_USAGE = 'Usage: customers:list';

/** pnpm forwards the "--" separator literally. */
const withoutSeparator = (argv: string[]) => argv.filter((arg) => arg !== '--');

/** Runs `customers:invite` and returns the process exit code. */
export async function runInviteCli(
  argv: string[],
  deps: CustomersCliDependencies,
): Promise<number> {
  let input: NewCustomerInput;
  try {
    const { values } = parseArgs({
      args: withoutSeparator(argv),
      options: {
        email: { type: 'string' },
        name: { type: 'string' },
        'tax-id': { type: 'string' },
        phone: { type: 'string' },
      },
      strict: true,
      allowPositionals: false,
    });
    if (values.email === undefined || values.name === undefined) {
      throw new RangeError('--email and --name are required');
    }
    input = {
      email: values.email,
      businessName: values.name,
      taxId: values['tax-id'],
      phone: values.phone,
    };
    prepareNewCustomer(input);
  } catch (error) {
    deps.stderr(`${(error as Error).message}\n\n${INVITE_USAGE}`);
    return 2;
  }

  let authAdmin: AuthAdmin;
  let webOrigin: string;
  try {
    authAdmin = deps.createAuthAdmin();
    webOrigin = deps.webOrigin();
  } catch (error) {
    deps.stderr(`Configuration error: ${(error as Error).message}`);
    return 1;
  }

  return withConnection(
    deps,
    'Inviting the customer',
    async (customers) => {
      const { outcome, customer } = await inviteCustomer(
        { customers, authAdmin, webOrigin },
        input,
      );
      switch (outcome) {
        case 'invited':
          deps.stdout(
            `Invitation sent to ${customer.email} (${customer.businessName}).`,
          );
          break;
        case 'resent':
          deps.stdout(
            `Customer ${customer.email} already existed (data unchanged): invitation re-sent.`,
          );
          break;
        case 'already_registered':
          deps.stdout(
            `${customer.email} already has a password: no email sent. They can sign in or use "¿Olvidaste tu contraseña?".`,
          );
          if (!customer.authUserId) {
            deps.stderr(
              `Warning: the Supabase user of ${customer.email} could not be linked; they will not be able to use the portal.`,
            );
          }
          break;
      }
      return 0;
    },
    'Nothing was lost: run the same command again to retry.',
  );
}

/** Runs `customers:suspend` / `customers:activate` and returns the exit code. */
export async function runSetStatusCli(
  argv: string[],
  status: CustomerStatus,
  deps: CustomersCliDependencies,
): Promise<number> {
  const usage = setStatusUsage(
    status === 'SUSPENDED' ? 'customers:suspend' : 'customers:activate',
  );
  let email: string;
  try {
    const { values } = parseArgs({
      args: withoutSeparator(argv),
      options: { email: { type: 'string' } },
      strict: true,
      allowPositionals: false,
    });
    if (values.email === undefined) throw new RangeError('--email is required');
    email = normalizeEmail(values.email);
  } catch (error) {
    deps.stderr(`${(error as Error).message}\n\n${usage}`);
    return 2;
  }

  return withConnection(deps, 'Updating the customer', async (customers) => {
    const customer = await setCustomerStatus(customers, email, status);
    deps.stdout(`${customer.email} is now ${customer.status}.`);
    return 0;
  });
}

/** Runs `customers:list` and returns the exit code. */
export async function runListCli(
  argv: string[],
  deps: CustomersCliDependencies,
): Promise<number> {
  if (withoutSeparator(argv).length > 0) {
    deps.stderr(LIST_USAGE);
    return 2;
  }
  return withConnection(deps, 'Listing customers', async (customers) => {
    const list = await listCustomers(customers);
    if (list.length === 0) {
      deps.stdout('No customers yet. Add one with customers:invite.');
      return 0;
    }
    list.forEach((customer) => deps.stdout(formatRow(customer)));
    deps.stdout(
      `${list.length} ${list.length === 1 ? 'customer' : 'customers'}`,
    );
    return 0;
  });
}

function formatRow(customer: Customer): string {
  return [
    customer.status.padEnd(9),
    (customer.authUserId ? 'linked' : 'pending').padEnd(7),
    customer.email,
    customer.businessName,
    customer.taxId ?? '-',
    customer.phone ?? '-',
  ].join('  ');
}

async function withConnection(
  deps: CustomersCliDependencies,
  task: string,
  run: (customers: CustomerRepository) => Promise<number>,
  retryHint = '',
): Promise<number> {
  let target: Awaited<ReturnType<CustomersCliDependencies['connect']>> | null =
    null;
  try {
    target = await deps.connect();
    return await run(target.customers);
  } catch (error) {
    const detail =
      error instanceof Error && error.name === 'CustomerNotFoundError'
        ? error.message
        : ((error as Error).stack ?? String(error));
    deps.stderr(
      `${task} failed: ${detail}${retryHint ? `\n${retryHint}` : ''}`,
    );
    return 1;
  } finally {
    await target?.close();
  }
}
