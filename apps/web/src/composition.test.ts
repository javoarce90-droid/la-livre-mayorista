import { describe, expect, it } from "vitest";
import { createCatalogRepository } from "./composition";
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
