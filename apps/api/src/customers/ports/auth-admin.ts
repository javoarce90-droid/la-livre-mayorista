export type InvitationResult =
  /** The invitation email was sent (or re-sent to a still pending user). */
  | { status: 'invited'; authUserId: string }
  /** The user already accepted an invitation or exists with a password. */
  | { status: 'already_registered'; authUserId: string | null };

/** Privileged access to the identity provider (Supabase Auth admin API). */
export interface AuthAdmin {
  inviteUserByEmail(
    email: string,
    options: { redirectTo: string },
  ): Promise<InvitationResult>;
}
