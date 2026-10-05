import { describe, expect, it } from "vitest";
import { createMockAccountRepository, DEMO_ACCOUNT_ID } from "../infrastructure/mock-account-repository";
import { getAccountOverview } from "./get-account-overview";

describe("getAccountOverview", () => {
  const now = new Date(2026, 9, 5);

  it("returns account, statement, activity and twelve months of sales", async () => {
    const overview = await getAccountOverview(createMockAccountRepository({ now }), DEMO_ACCOUNT_ID, now);
    expect(overview.account.bookstoreName).toBeTruthy();
    expect(overview.monthlySales).toHaveLength(12);
    expect(overview.consignment).not.toBeNull();
  });

  it("omits consignment when the account has none", async () => {
    const repository = createMockAccountRepository({ now, flags: { hasConsignment: false } });
    const overview = await getAccountOverview(repository, DEMO_ACCOUNT_ID, now);
    expect(overview.consignment).toBeNull();
  });
});
