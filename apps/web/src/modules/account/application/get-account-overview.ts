import type { Account, AccountActivity, AccountStatement, Consignment } from "../domain/account";
import { lastTwelveMonths, type MonthlySalePoint } from "../domain/monthly-sales";
import type { AccountRepository } from "./account-repository";

export interface AccountOverview {
  account: Account;
  statement: AccountStatement;
  activity: AccountActivity;
  consignment: Consignment | null;
  monthlySales: MonthlySalePoint[];
}

export async function getAccountOverview(
  accounts: AccountRepository,
  accountId: string,
  now: Date = new Date(),
): Promise<AccountOverview> {
  const account = await accounts.getAccount(accountId);
  const [statement, activity, consignment, sales] = await Promise.all([
    accounts.getStatement(accountId),
    accounts.getActivity(accountId),
    account.flags.hasConsignment ? accounts.getConsignment(accountId) : Promise.resolve(null),
    accounts.getMonthlySales(accountId),
  ]);
  return { account, statement, activity, consignment, monthlySales: lastTwelveMonths(sales, now) };
}
