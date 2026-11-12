/**
 * Composition root: the only place that knows which adapters back each port.
 * The catalog comes from the La Livre API when API_INTERNAL_URL is set (server-side only);
 * Auth uses Supabase when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set
 * (the account then comes from the API `GET /me`); otherwise the in-memory demo user and mock account.
 * Dashboard data (statement, activity, consignment, sales, notifications) is still mocked.
 */
import type { AccountRepository } from "@/modules/account/application/account-repository";
import type { AccountFlags, DeliveryZone } from "@/modules/account/domain/account";
import { createMockAccountRepository, DEMO_ACCOUNT_ID } from "@/modules/account/infrastructure/mock-account-repository";
import type { AccountResolver } from "@/modules/account/application/account-resolver";
import { ApiAccountResolver } from "@/modules/account/infrastructure/api-account-resolver";
import { MockAccountResolver } from "@/modules/account/infrastructure/mock-account-resolver";
import type { AuthGateway } from "@/modules/auth/application/auth-gateway";
import { cookieSessionStore } from "@/modules/auth/infrastructure/cookie-session";
import { InMemoryAuthGateway } from "@/modules/auth/infrastructure/in-memory-auth-gateway";
import { InMemoryUserDirectory } from "@/modules/auth/infrastructure/in-memory-user-directory";
import { createSupabaseServerClient } from "@/modules/auth/infrastructure/supabase/server-client";
import { SupabaseAuthGateway } from "@/modules/auth/infrastructure/supabase/supabase-auth-gateway";
import { readSupabaseConfig } from "@/modules/auth/infrastructure/supabase/supabase-config";
import type { CatalogRepository } from "@/modules/catalog/application/catalog-repository";
import { ApiCatalogRepository } from "@/modules/catalog/infrastructure/api-catalog-repository";
import { InMemoryCatalogRepository } from "@/modules/catalog/infrastructure/in-memory-catalog-repository";
import { SEED_BOOKS } from "@/modules/catalog/infrastructure/seed-books";
import type { OrderDeps } from "@/modules/order/application/order-context";
import type { OrderRepository } from "@/modules/order/application/order-repository";
import type { Order } from "@/modules/order/domain/order";
import { InMemoryOrderRepository } from "@/modules/order/infrastructure/in-memory-order-repository";
import { createSeedOrder } from "@/modules/order/infrastructure/seed-order";
import { isoDate } from "@/shared/lib/dates";

export interface Container {
  catalog: CatalogRepository;
  accounts: AccountRepository;
  orders: OrderRepository;
  auth: AuthGateway;
  accountResolver: AccountResolver;
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

const apiUrl = (env: Partial<Record<string, string>>) => env.API_INTERNAL_URL?.trim() || null;

/** La Livre API when API_INTERNAL_URL is set (Vercel service binding), otherwise the in-memory seeds. */
export function createCatalogRepository(env: Partial<Record<string, string>>): CatalogRepository {
  const baseUrl = apiUrl(env);
  return baseUrl
    ? new ApiCatalogRepository({ baseUrl, token: env.API_INTERNAL_TOKEN })
    : new InMemoryCatalogRepository(SEED_BOOKS);
}

/** Supabase Auth when configured, otherwise the in-memory demo user with a signed cookie. */
export function createAuthGateway(env: Partial<Record<string, string>>): AuthGateway {
  const supabase = readSupabaseConfig(env);
  return supabase
    ? new SupabaseAuthGateway(() => createSupabaseServerClient(supabase))
    : new InMemoryAuthGateway(new InMemoryUserDirectory(), cookieSessionStore);
}

/** With Supabase Auth the account is the API customer (`GET /me`); otherwise the mock account. */
export function createAccountResolver(env: Partial<Record<string, string>>, accounts: AccountRepository): AccountResolver {
  if (!readSupabaseConfig(env)) return new MockAccountResolver(accounts);
  const baseUrl = apiUrl(env);
  // Fail on use, not on creation: `next build` evaluates the container without the service binding.
  if (!baseUrl) {
    return {
      resolve: () =>
        Promise.reject(new Error("API_INTERNAL_URL is required when Supabase Auth is enabled (NEXT_PUBLIC_SUPABASE_*).")),
    };
  }
  return new ApiAccountResolver({ baseUrl, token: env.API_INTERNAL_TOKEN });
}

function createContainer(): Container {
  const zone: DeliveryZone = process.env.LALIVRE_MOCK_ZONE === "AMBA" ? "AMBA" : "Interior";
  // The demo order references seed books, which do not exist in the real catalog.
  const initialOrders: Record<string, Order> = apiUrl(process.env) ? {} : { [DEMO_ACCOUNT_ID]: createSeedOrder(new Date(), 10) };
  const accounts = createMockAccountRepository({ zone, flags: mockFlags() });
  return {
    catalog: createCatalogRepository(process.env),
    accounts,
    orders: new InMemoryOrderRepository(initialOrders),
    auth: createAuthGateway(process.env),
    accountResolver: createAccountResolver(process.env, accounts),
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
