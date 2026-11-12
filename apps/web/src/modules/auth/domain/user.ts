/** What the portal shows about the signed-in person (name comes from the account). */
export interface User {
  email: string;
  name: string;
  accountId: string;
}

/** Identity of the current session, as reported by the auth provider. */
export interface SessionUser {
  /** Provider user id (Supabase auth user id; the account id in the in-memory mock). */
  id: string;
  email: string;
  /** Bearer token proving the session to the La Livre API; null in the in-memory mock. */
  accessToken: string | null;
}
