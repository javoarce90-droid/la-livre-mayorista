import type { SessionUser } from "@/modules/auth/domain/user";
import type { Result } from "@/shared/lib/result";
import type { Account } from "../domain/account";

export type AccountResolutionError =
  /** Signed in, but La Livre never enabled a customer for this user. */
  | "account_not_found"
  /** The API rejected the session token: the user must sign in again. */
  | "session_expired";

/** Port: the account behind the signed-in user (La Livre API, or the mock). */
export interface AccountResolver {
  resolve(user: SessionUser): Promise<Result<Account, AccountResolutionError>>;
}
