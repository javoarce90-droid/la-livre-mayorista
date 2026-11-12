import type { Customer, NewCustomer } from '../domain/customer.js';
import type { AuthAdmin, InvitationResult } from '../ports/auth-admin.js';
import type { CustomerRepository } from '../ports/customer-repository.js';
import {
  CustomerNotFoundError,
  invitationRedirectUrl,
  inviteCustomer,
  listCustomers,
  setCustomerStatus,
} from './customer-use-cases.js';

/** In-memory fake of the repository port. */
class FakeCustomers implements CustomerRepository {
  readonly rows: Customer[] = [];
  private nextId = 1;

  async findByEmail(email: string) {
    return this.rows.find((row) => row.email === email) ?? null;
  }
  async findByAuthUserId(authUserId: string) {
    return this.rows.find((row) => row.authUserId === authUserId) ?? null;
  }
  async create(customer: NewCustomer) {
    const now = new Date('2026-11-05T12:00:00Z');
    const row: Customer = {
      ...customer,
      id: `cus-${this.nextId++}`,
      authUserId: null,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return { ...row };
  }
  async linkAuthUser(customerId: string, authUserId: string) {
    const row = this.rows.find((r) => r.id === customerId)!;
    row.authUserId = authUserId;
    return { ...row };
  }
  async setStatus(email: string, status: Customer['status']) {
    const row = this.rows.find((r) => r.email === email);
    if (!row) return null;
    row.status = status;
    return { ...row };
  }
  async list() {
    return [...this.rows].sort((a, b) =>
      a.businessName.localeCompare(b.businessName),
    );
  }
}

function fakeAuthAdmin(result: InvitationResult | Error) {
  const inviteUserByEmail = vi.fn<AuthAdmin['inviteUserByEmail']>(async () => {
    if (result instanceof Error) throw result;
    return result;
  });
  return { inviteUserByEmail };
}

const WEB_ORIGIN = 'https://portal.lalivre.com.ar/';
const INPUT = {
  email: ' Compras@Libreria.com ',
  businessName: 'Librería del Puerto',
  taxId: '20-12345678-6',
};

describe('invitationRedirectUrl', () => {
  it('points to /auth/confirm and then to the set-password page', () => {
    expect(invitationRedirectUrl(WEB_ORIGIN)).toBe(
      'https://portal.lalivre.com.ar/auth/confirm?next=/cuenta/clave',
    );
  });

  it('rejects an origin that is not an http(s) URL', () => {
    expect(() => invitationRedirectUrl('portal.lalivre.com.ar')).toThrow(
      RangeError,
    );
  });
});

describe('inviteCustomer', () => {
  it('creates the customer, invites it and links the auth user', async () => {
    const customers = new FakeCustomers();
    const authAdmin = fakeAuthAdmin({ status: 'invited', authUserId: 'u-1' });

    const result = await inviteCustomer(
      { customers, authAdmin, webOrigin: WEB_ORIGIN },
      INPUT,
    );

    expect(authAdmin.inviteUserByEmail).toHaveBeenCalledWith(
      'compras@libreria.com',
      {
        redirectTo:
          'https://portal.lalivre.com.ar/auth/confirm?next=/cuenta/clave',
      },
    );
    expect(result.outcome).toBe('invited');
    expect(result.customer).toMatchObject({
      email: 'compras@libreria.com',
      businessName: 'Librería del Puerto',
      taxId: '20123456786',
      authUserId: 'u-1',
      status: 'ACTIVE',
    });
  });

  it('re-sends the invitation to an existing pending customer without duplicating it', async () => {
    const customers = new FakeCustomers();
    await customers.create({
      email: 'compras@libreria.com',
      businessName: 'Nombre original',
      taxId: null,
      phone: null,
    });
    const authAdmin = fakeAuthAdmin({ status: 'invited', authUserId: 'u-1' });

    const result = await inviteCustomer(
      { customers, authAdmin, webOrigin: WEB_ORIGIN },
      INPUT,
    );

    expect(result.outcome).toBe('resent');
    expect(customers.rows).toHaveLength(1);
    // Existing data is kept: the invite command never edits a customer.
    expect(result.customer.businessName).toBe('Nombre original');
    expect(result.customer.authUserId).toBe('u-1');
  });

  it('reports an already registered user and links it when the id is known', async () => {
    const customers = new FakeCustomers();
    const authAdmin = fakeAuthAdmin({
      status: 'already_registered',
      authUserId: 'u-9',
    });

    const result = await inviteCustomer(
      { customers, authAdmin, webOrigin: WEB_ORIGIN },
      INPUT,
    );

    expect(result.outcome).toBe('already_registered');
    expect(result.customer.authUserId).toBe('u-9');
  });

  it('keeps the customer when the invitation fails, so a retry re-sends it', async () => {
    const customers = new FakeCustomers();
    const authAdmin = fakeAuthAdmin(new Error('smtp rate limit'));

    await expect(
      inviteCustomer({ customers, authAdmin, webOrigin: WEB_ORIGIN }, INPUT),
    ).rejects.toThrow('smtp rate limit');
    expect(customers.rows).toHaveLength(1);
    expect(customers.rows[0].authUserId).toBeNull();
  });

  it('validates the input before touching any port', async () => {
    const customers = new FakeCustomers();
    const authAdmin = fakeAuthAdmin({ status: 'invited', authUserId: 'u-1' });

    await expect(
      inviteCustomer(
        { customers, authAdmin, webOrigin: WEB_ORIGIN },
        { ...INPUT, taxId: '20-12345678-9' },
      ),
    ).rejects.toThrow(RangeError);
    expect(customers.rows).toHaveLength(0);
    expect(authAdmin.inviteUserByEmail).not.toHaveBeenCalled();
  });
});

describe('setCustomerStatus', () => {
  it('suspends and re-activates a customer found by email (case-insensitive)', async () => {
    const customers = new FakeCustomers();
    await customers.create({
      email: 'compras@libreria.com',
      businessName: 'X',
      taxId: null,
      phone: null,
    });

    const suspended = await setCustomerStatus(
      customers,
      'COMPRAS@libreria.com',
      'SUSPENDED',
    );
    expect(suspended.status).toBe('SUSPENDED');

    const active = await setCustomerStatus(
      customers,
      'compras@libreria.com',
      'ACTIVE',
    );
    expect(active.status).toBe('ACTIVE');
  });

  it('throws CustomerNotFoundError for an unknown email', async () => {
    await expect(
      setCustomerStatus(new FakeCustomers(), 'nadie@x.com', 'SUSPENDED'),
    ).rejects.toThrow(CustomerNotFoundError);
  });
});

describe('listCustomers', () => {
  it('returns every customer ordered by business name', async () => {
    const customers = new FakeCustomers();
    for (const businessName of ['Zeta', 'Alfa']) {
      await customers.create({
        email: `${businessName.toLowerCase()}@x.com`,
        businessName,
        taxId: null,
        phone: null,
      });
    }

    const list = await listCustomers(customers);

    expect(list.map((c) => c.businessName)).toEqual(['Alfa', 'Zeta']);
  });
});
