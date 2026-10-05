import { cache } from "react";
import { redirect } from "next/navigation";
import type { Account } from "@/modules/account/domain/account";
import type { User } from "@/modules/auth/domain/user";
import { readSessionUser } from "@/modules/auth/infrastructure/cookie-session";
import { container } from "./composition";

export interface PortalContext {
  user: User;
  account: Account;
}

/** Real auth check for portal pages and actions (proxy.ts is only optimistic). */
export const requirePortalContext = cache(async (): Promise<PortalContext> => {
  const user = await readSessionUser();
  if (!user) redirect("/login");
  const account = await container().accounts.getAccount(user.accountId);
  return { user, account };
});
