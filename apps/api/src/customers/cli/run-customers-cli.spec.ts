import type { Customer } from '../domain/customer.js';
import type { AuthAdmin } from '../ports/auth-admin.js';
import type { CustomerRepository } from '../ports/customer-repository.js';
import type { CustomersCliDependencies } from './run-customers-cli.js';
import {
  runInviteCli,
  runListCli,
  runSetStatusCli,
} from './run-customers-cli.js';

const customer: Customer = {
  id: 'cus-1',
  authUserId: 'u-1',
  email: 'compras@libreria.com',
  businessName: 'Librería del Puerto',
  taxId: '20123456786',
  phone: null,
  status: 'ACTIVE',
  createdAt: new Date('2026-11-05T12:00:00Z'),
  updatedAt: new Date('2026-11-05T12:00:00Z'),
};

function repository(
  overrides: Partial<CustomerRepository> = {},
): CustomerRepository {
  return {
    findByEmail: vi.fn(async () => null),
    findByAuthUserId: vi.fn(async () => null),
    create: vi.fn(async (data) => ({ ...customer, ...data, authUserId: null })),
    linkAuthUser: vi.fn(async (_id, authUserId) => ({
      ...customer,
      authUserId,
    })),
    setStatus: vi.fn(async (email, status) => ({ ...customer, email, status })),
    list: vi.fn(async () => [customer]),
    ...overrides,
  };
}

function harness(
  customers: CustomerRepository = repository(),
  authAdmin: AuthAdmin & { inviteUserByEmail: ReturnType<typeof vi.fn> } = {
    inviteUserByEmail: vi.fn(async () => ({
      status: 'invited' as const,
      authUserId: 'u-1',
    })),
  },
) {
  const out: string[] = [];
  const err: string[] = [];
  const close = vi.fn(async () => {});
  const deps: CustomersCliDependencies = {
    stdout: (line) => out.push(line),
    stderr: (line) => err.push(line),
    connect: vi.fn(async () => ({ customers, close })),
    createAuthAdmin: vi.fn(() => authAdmin),
    webOrigin: vi.fn(() => 'http://localhost:3000'),
  };
  return {
    deps,
    close,
    authAdmin,
    out: () => out.join('\n'),
    err: () => err.join('\n'),
  };
}

describe('runInviteCli', () => {
  it('creates and invites the customer (pnpm "--" separator included)', async () => {
    const h = harness();

    const code = await runInviteCli(
      [
        '--',
        '--email',
        'Compras@Libreria.com',
        '--name',
        'Librería del Puerto',
        '--tax-id',
        '20-12345678-6',
        '--phone',
        '+54 11 5555-5555',
      ],
      h.deps,
    );

    expect(code).toBe(0);
    expect(h.authAdmin.inviteUserByEmail).toHaveBeenCalledWith(
      'compras@libreria.com',
      { redirectTo: 'http://localhost:3000/auth/confirm?next=/cuenta/clave' },
    );
    expect(h.out()).toContain('Invitation sent to compras@libreria.com');
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('says so when the invitation is re-sent to a pending customer', async () => {
    const h = harness(
      repository({
        findByEmail: vi.fn(async () => ({ ...customer, authUserId: null })),
      }),
    );

    const code = await runInviteCli(
      ['--email', 'compras@libreria.com', '--name', 'Otro nombre'],
      h.deps,
    );

    expect(code).toBe(0);
    expect(h.out()).toMatch(/already existed.*re-sent/s);
  });

  it('explains that an already registered customer gets no email', async () => {
    const h = harness(repository(), {
      inviteUserByEmail: vi.fn(async () => ({
        status: 'already_registered' as const,
        authUserId: null,
      })),
    });

    const code = await runInviteCli(
      ['--email', 'compras@libreria.com', '--name', 'X'],
      h.deps,
    );

    expect(code).toBe(0);
    expect(h.out()).toMatch(/already has a password/);
    expect(h.err()).toMatch(/could not be linked/);
  });

  it('rejects missing or invalid options with exit code 2 before connecting', async () => {
    for (const argv of [
      [],
      ['--email', 'compras@libreria.com'],
      ['--email', 'nope', '--name', 'X'],
      ['--email', 'a@b.com', '--name', 'X', '--tax-id', '123'],
      ['--bogus'],
    ]) {
      const h = harness();
      expect(await runInviteCli(argv, h.deps)).toBe(2);
      expect(h.err()).toMatch(/Usage/);
      expect(h.deps.connect).not.toHaveBeenCalled();
    }
  });

  it('fails with exit code 1 when Supabase or WEB_ORIGIN is not configured', async () => {
    const h = harness();
    h.deps.createAuthAdmin = () => {
      throw new Error('SUPABASE_SECRET_KEY is not set');
    };

    const code = await runInviteCli(
      ['--email', 'a@b.com', '--name', 'X'],
      h.deps,
    );

    expect(code).toBe(1);
    expect(h.err()).toContain('SUPABASE_SECRET_KEY is not set');
    expect(h.deps.connect).not.toHaveBeenCalled();
  });

  it('reports invitation failures with exit code 1 and still closes', async () => {
    const h = harness(repository(), {
      inviteUserByEmail: vi.fn(async () => {
        throw new Error('Email rate limit exceeded');
      }),
    });

    const code = await runInviteCli(
      ['--email', 'a@b.com', '--name', 'X'],
      h.deps,
    );

    expect(code).toBe(1);
    expect(h.err()).toContain('Email rate limit exceeded');
    expect(h.err()).toMatch(/run the same command again/);
    expect(h.close).toHaveBeenCalledOnce();
  });
});

describe('runSetStatusCli', () => {
  it('suspends a customer by email', async () => {
    const h = harness();

    const code = await runSetStatusCli(
      ['--', '--email', 'compras@libreria.com'],
      'SUSPENDED',
      h.deps,
    );

    expect(code).toBe(0);
    expect(h.out()).toContain('compras@libreria.com is now SUSPENDED');
    expect(h.deps.createAuthAdmin).not.toHaveBeenCalled();
    expect(h.close).toHaveBeenCalledOnce();
  });

  it('fails with exit code 1 for an unknown customer', async () => {
    const h = harness(repository({ setStatus: vi.fn(async () => null) }));

    const code = await runSetStatusCli(
      ['--email', 'nadie@x.com'],
      'ACTIVE',
      h.deps,
    );

    expect(code).toBe(1);
    expect(h.err()).toContain('No customer with email nadie@x.com');
  });

  it('requires a valid --email (exit code 2)', async () => {
    for (const argv of [[], ['--email', 'nope']]) {
      const h = harness();
      expect(await runSetStatusCli(argv, 'ACTIVE', h.deps)).toBe(2);
      expect(h.err()).toMatch(/Usage/);
    }
  });
});

describe('runListCli', () => {
  it('prints one line per customer with status and invitation state', async () => {
    const pending = {
      ...customer,
      email: 'b@x.com',
      authUserId: null,
      taxId: null,
    };
    const h = harness(
      repository({ list: vi.fn(async () => [customer, pending]) }),
    );

    const code = await runListCli([], h.deps);

    expect(code).toBe(0);
    expect(h.out()).toMatch(
      /ACTIVE\s+linked\s+compras@libreria\.com\s+Librería del Puerto\s+20123456786/,
    );
    expect(h.out()).toMatch(/pending\s+b@x\.com/);
    expect(h.out()).toContain('2 customers');
  });

  it('says when there are no customers', async () => {
    const h = harness(repository({ list: vi.fn(async () => []) }));
    expect(await runListCli(['--'], h.deps)).toBe(0);
    expect(h.out()).toContain('No customers yet');
  });
});
