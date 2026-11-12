import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthAdmin, InvitationResult } from '../ports/auth-admin.js';

/** The slice of `supabase.auth.admin` this adapter uses. */
export type AdminAuthClient = Pick<
  SupabaseClient['auth']['admin'],
  'inviteUserByEmail' | 'listUsers'
>;

/** Supabase error codes meaning "this email already has a confirmed user". */
const ALREADY_REGISTERED = new Set(['email_exists', 'user_already_exists']);
const DEFAULT_PAGE_SIZE = 1000;

/**
 * Supabase Auth admin adapter. Requires the project's SECRET key: never use it
 * outside trusted server-side tooling.
 */
export class SupabaseAuthAdmin implements AuthAdmin {
  private readonly pageSize: number;

  constructor(
    private readonly admin: AdminAuthClient,
    { pageSize = DEFAULT_PAGE_SIZE }: { pageSize?: number } = {},
  ) {
    this.pageSize = pageSize;
  }

  async inviteUserByEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<InvitationResult> {
    // Supabase re-sends the invitation when the user exists but never confirmed.
    const { data, error } = await this.admin.inviteUserByEmail(email, options);
    if (!error && data.user) {
      return { status: 'invited', authUserId: data.user.id };
    }
    if (error?.code && ALREADY_REGISTERED.has(error.code)) {
      return {
        status: 'already_registered',
        authUserId: await this.findUserIdByEmail(email),
      };
    }
    throw new Error(
      `Supabase invitation failed: ${error?.message ?? 'no user returned'}`,
    );
  }

  /** The admin API has no lookup by email: page through the users. */
  private async findUserIdByEmail(email: string): Promise<string | null> {
    const wanted = email.toLowerCase();
    for (let page = 1; ; page++) {
      const { data, error } = await this.admin.listUsers({
        page,
        perPage: this.pageSize,
      });
      if (error) throw new Error(`Supabase listUsers failed: ${error.message}`);
      const match = data.users.find(
        (user) => user.email?.toLowerCase() === wanted,
      );
      if (match) return match.id;
      if (data.users.length < this.pageSize) return null;
    }
  }
}

/** Admin client authenticated with the secret key; no session persistence. */
export function createSupabaseAuthAdmin(
  supabaseUrl: string,
  secretKey: string,
): SupabaseAuthAdmin {
  const client = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return new SupabaseAuthAdmin(client.auth.admin);
}
