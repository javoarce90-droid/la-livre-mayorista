import type { SessionUser } from "@/modules/auth/domain/user";
import type { Result } from "@/shared/lib/result";
import { ok } from "@/shared/lib/result";
import type { AccountRepository } from "../application/account-repository";
import type { AccountResolutionError, AccountResolver } from "../application/account-resolver";
import type { Account } from "../domain/account";

/** In-memory auth fallback: the mock user id is the mock account id. */
export class MockAccountResolver implements AccountResolver {
  constructor(private readonly accounts: AccountRepository) {}

  async resolve(user: SessionUser): Promise<Result<Account, AccountResolutionError>> {
    return ok(await this.accounts.getAccount(user.id));
  }
}
