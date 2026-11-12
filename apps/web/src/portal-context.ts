import { cache } from "react";
import { redirect } from "next/navigation";
import type { Account } from "@/modules/account/domain/account";
import { LOGIN_PATH, SIGN_OUT_PATH } from "@/modules/auth/domain/auth-paths";
import type { User } from "@/modules/auth/domain/user";
import { container } from "./composition";

export interface PortalContext {
  user: User;
  account: Account;
}

/** Real auth check for portal pages and actions (proxy.ts is only a first filter). */
export const requirePortalContext = cache(async (): Promise<PortalContext> => {
  const { auth, accountResolver } = container();
  const sessionUser = await auth.currentUser();
  if (!sessionUser) redirect(LOGIN_PATH);

  const account = await accountResolver.resolve(sessionUser);
  if (!account.ok) {
    // Server Components cannot clear cookies: a Route Handler signs out and shows the reason.
    redirect(account.error === "account_not_found" ? `${SIGN_OUT_PATH}?motivo=sin_cuenta` : SIGN_OUT_PATH);
  }
  return {
    user: { email: sessionUser.email, name: account.value.bookstoreName, accountId: account.value.id },
    account: account.value,
  };
});
