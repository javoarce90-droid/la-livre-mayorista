/**
 * Composition root: the only place that knows which adapters back each port.
 * Swapping the mocks for the La Livre API only touches this file and `infrastructure/`.
 */
import type { AccountRepository } from "@/modules/account/application/account-repository";
import type { AccountFlags, DeliveryZone } from "@/modules/account/domain/account";
import { createMockAccountRepository, DEMO_ACCOUNT_ID } from "@/modules/account/infrastructure/mock-account-repository";
import type { UserDirectory } from "@/modules/auth/application/user-directory";
import { InMemoryUserDirectory } from "@/modules/auth/infrastructure/in-memory-user-directory";
import type { CatalogRepository } from "@/modules/catalog/application/catalog-repository";
import { InMemoryCatalogRepository } from "@/modules/catalog/infrastructure/in-memory-catalog-repository";
import { SEED_BOOKS } from "@/modules/catalog/infrastructure/seed-books";
import type { OrderDeps } from "@/modules/order/application/order-context";
import type { OrderRepository } from "@/modules/order/application/order-repository";
import { InMemoryOrderRepository } from "@/modules/order/infrastructure/in-memory-order-repository";
import { createSeedOrder } from "@/modules/order/infrastructure/seed-order";
import { isoDate } from "@/shared/lib/dates";

export interface Container {
  catalog: CatalogRepository;
  accounts: AccountRepository;
  orders: OrderRepository;
  users: UserDirectory;
}

const flagFromEnv = (name: string) => process.env[name] === "1";

/** Mock account flags are configurable via env to preview every portal state (see README). */
function mockFlags(): Partial<AccountFlags> {
  return {
    hasConsignment: !flagFromEnv("LALIVRE_MOCK_NO_CONSIGNMENT"),
    hasPromotions: !flagFromEnv("LALIVRE_MOCK_NO_PROMOTIONS"),
    suspended: flagFromEnv("LALIVRE_MOCK_SUSPENDED"),
    orderLocked: flagFromEnv("LALIVRE_MOCK_ORDER_LOCKED"),
  };
}

function createContainer(): Container {
  const zone: DeliveryZone = process.env.LALIVRE_MOCK_ZONE === "AMBA" ? "AMBA" : "Interior";
  return {
    catalog: new InMemoryCatalogRepository(SEED_BOOKS),
    accounts: createMockAccountRepository({ zone, flags: mockFlags() }),
    orders: new InMemoryOrderRepository({ [DEMO_ACCOUNT_ID]: createSeedOrder(new Date(), 10) }),
    users: new InMemoryUserDirectory(),
  };
}

// Survive dev hot reloads so the in-memory order is not lost on every edit.
const globalForContainer = globalThis as typeof globalThis & { __laLivreContainer?: Container };

export function container(): Container {
  globalForContainer.__laLivreContainer ??= createContainer();
  return globalForContainer.__laLivreContainer;
}

export function orderDeps(): OrderDeps {
  const { catalog, orders } = container();
  return { catalog, orders, today: isoDate() };
}
