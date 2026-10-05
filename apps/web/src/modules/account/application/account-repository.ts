import type { Account, AccountActivity, AccountStatement, Consignment, MonthlySale } from "../domain/account";

/** Port: account data (mock today, La Livre API tomorrow). */
export interface AccountRepository {
  getAccount(accountId: string): Promise<Account>;
  getStatement(accountId: string): Promise<AccountStatement>;
  getActivity(accountId: string): Promise<AccountActivity>;
  getConsignment(accountId: string): Promise<Consignment | null>;
  getMonthlySales(accountId: string): Promise<MonthlySale[]>;
  getUnreadNotifications(accountId: string): Promise<number>;
}
