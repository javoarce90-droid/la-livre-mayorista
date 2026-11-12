import type { AdminAuthClient } from './supabase-auth-admin.js';
import { SupabaseAuthAdmin } from './supabase-auth-admin.js';

const REDIRECT = {
  redirectTo: 'https://portal.test/auth/confirm?next=/cuenta/clave',
};

function client(overrides: Partial<AdminAuthClient>): AdminAuthClient {
  return {
    inviteUserByEmail: vi.fn(),
    listUsers: vi.fn(),
    ...overrides,
  } as AdminAuthClient;
}

function apiError(code: string, message = code) {
  return Object.assign(new Error(message), { code, status: 422 });
}

describe('SupabaseAuthAdmin', () => {
  it('invites the user with the redirect URL and returns its id', async () => {
    const inviteUserByEmail = vi.fn(async () => ({
      data: { user: { id: 'u-1' } },
      error: null,
    }));
    const admin = new SupabaseAuthAdmin(
      client({ inviteUserByEmail } as unknown as Partial<AdminAuthClient>),
    );

    const result = await admin.inviteUserByEmail('a@b.com', REDIRECT);

    expect(result).toEqual({ status: 'invited', authUserId: 'u-1' });
    expect(inviteUserByEmail).toHaveBeenCalledWith('a@b.com', REDIRECT);
  });

  it('reports an already registered user and looks its id up by email', async () => {
    const inviteUserByEmail = vi.fn(async () => ({
      data: { user: null },
      error: apiError('email_exists'),
    }));
    const listUsers = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          users: Array.from({ length: 2 }, (_, i) => ({
            id: `other-${i}`,
            email: `other${i}@x.com`,
          })),
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { users: [{ id: 'u-7', email: 'A@B.com' }] },
        error: null,
      });
    const admin = new SupabaseAuthAdmin(
      client({
        inviteUserByEmail,
        listUsers,
      } as unknown as Partial<AdminAuthClient>),
      { pageSize: 2 },
    );

    const result = await admin.inviteUserByEmail('a@b.com', REDIRECT);

    expect(result).toEqual({ status: 'already_registered', authUserId: 'u-7' });
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 2 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 2 });
  });

  it('returns a null id when an already registered user cannot be found', async () => {
    const admin = new SupabaseAuthAdmin(
      client({
        inviteUserByEmail: vi.fn(async () => ({
          data: { user: null },
          error: apiError('user_already_exists'),
        })),
        listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })),
      } as unknown as Partial<AdminAuthClient>),
    );

    expect(await admin.inviteUserByEmail('a@b.com', REDIRECT)).toEqual({
      status: 'already_registered',
      authUserId: null,
    });
  });

  it('throws on any other error, keeping the Supabase message', async () => {
    const admin = new SupabaseAuthAdmin(
      client({
        inviteUserByEmail: vi.fn(async () => ({
          data: { user: null },
          error: apiError(
            'over_email_send_rate_limit',
            'Email rate limit exceeded',
          ),
        })),
      } as unknown as Partial<AdminAuthClient>),
    );

    await expect(admin.inviteUserByEmail('a@b.com', REDIRECT)).rejects.toThrow(
      /Email rate limit exceeded/,
    );
  });
});
