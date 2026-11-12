import { describe, expect, it } from "vitest";
import { createAccountResolver, createAuthGateway, createCatalogRepository } from "./composition";
import { ApiAccountResolver } from "./modules/account/infrastructure/api-account-resolver";
import { createMockAccountRepository } from "./modules/account/infrastructure/mock-account-repository";
import { MockAccountResolver } from "./modules/account/infrastructure/mock-account-resolver";
import { InMemoryAuthGateway } from "./modules/auth/infrastructure/in-memory-auth-gateway";
import { SupabaseAuthGateway } from "./modules/auth/infrastructure/supabase/supabase-auth-gateway";
import { ApiCatalogRepository } from "./modules/catalog/infrastructure/api-catalog-repository";
import { InMemoryCatalogRepository } from "./modules/catalog/infrastructure/in-memory-catalog-repository";

describe("createCatalogRepository", () => {
  it("uses the La Livre API when API_INTERNAL_URL is set", () => {
    expect(createCatalogRepository({ API_INTERNAL_URL: "http://api", API_INTERNAL_TOKEN: "t" })).toBeInstanceOf(
      ApiCatalogRepository,
    );
  });

  it("falls back to the in-memory seeds otherwise", () => {
    expect(createCatalogRepository({})).toBeInstanceOf(InMemoryCatalogRepository);
    expect(createCatalogRepository({ API_INTERNAL_URL: "  " })).toBeInstanceOf(InMemoryCatalogRepository);
  });
});

const SUPABASE = {
  NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_x",
};

describe("createAuthGateway", () => {
  it("uses Supabase Auth when both public variables are set", () => {
    expect(createAuthGateway(SUPABASE)).toBeInstanceOf(SupabaseAuthGateway);
  });

  it("falls back to the in-memory demo auth otherwise", () => {
    expect(createAuthGateway({})).toBeInstanceOf(InMemoryAuthGateway);
    expect(createAuthGateway({ NEXT_PUBLIC_SUPABASE_URL: SUPABASE.NEXT_PUBLIC_SUPABASE_URL })).toBeInstanceOf(
      InMemoryAuthGateway,
    );
  });
});

describe("createAccountResolver", () => {
  const accounts = createMockAccountRepository();

  it("resolves accounts through the API GET /me with Supabase Auth", () => {
    expect(createAccountResolver({ ...SUPABASE, API_INTERNAL_URL: "http://api" }, accounts)).toBeInstanceOf(
      ApiAccountResolver,
    );
  });

  it("fails on use, not on creation, without API_INTERNAL_URL (the build has no service binding)", async () => {
    const resolver = createAccountResolver(SUPABASE, accounts);
    await expect(resolver.resolve({ id: "u1", email: "a@b.c" } as never)).rejects.toThrow(/API_INTERNAL_URL/);
  });

  it("uses the mock account with the in-memory auth", () => {
    expect(createAccountResolver({ API_INTERNAL_URL: "http://api" }, accounts)).toBeInstanceOf(MockAccountResolver);
  });
});
