import { DEMO_ACCOUNT_ID } from "@/modules/account/infrastructure/mock-account-repository";
import type { UserDirectory } from "../application/user-directory";
import type { Credentials } from "../domain/credentials";
import type { User } from "../domain/user";

export const DEMO_CREDENTIALS = { email: "demo@lalivre.com", password: "lalivre123" } as const;

const USERS: readonly (User & { password: string })[] = [
  { ...DEMO_CREDENTIALS, name: "Librería del Puerto", accountId: DEMO_ACCOUNT_ID },
];

/** Mock adapter with a single demo user. Never use in production. */
export class InMemoryUserDirectory implements UserDirectory {
  async authenticate({ email, password }: Credentials): Promise<User | null> {
    const match = USERS.find((user) => user.email === email.toLowerCase() && user.password === password);
    return match ? { email: match.email, name: match.name, accountId: match.accountId } : null;
  }
}
