import { describe, expect, it, vi } from "vitest";
import { NO_FILTERS } from "../domain/search-filters";
import type { SearchQuery } from "../domain/search-query";
import { CatalogUnavailableError } from "../application/catalog-repository";
import { ApiCatalogRepository } from "./api-catalog-repository";

const DTO = {
  isbn: "9788466331234",
  title: "Ficciones",
  author: "Borges, Jorge Luis",
  publisher: "Debolsillo",
  year: 2011,
  language: "spa",
  pages: 224,
  description: "Cuentos.",
  coverUrl: null,
  priceCents: 1_738_000,
  currency: "ARS",
  priceUpdatedAt: "2026-11-04T08:00:00.000Z",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function setup(response: () => Response = () => json({ items: [DTO], total: 41 }), token: string | undefined = "s3cret") {
  const fetchMock = vi.fn<(url: string, init?: RequestInit & { next?: { revalidate?: number } }) => Promise<Response>>(
    async () => response(),
  );
  const repo = new ApiCatalogRepository({ baseUrl: "http://api.internal/", token, fetch: fetchMock as unknown as typeof fetch });
  const lastUrl = () => new URL(fetchMock.mock.calls.at(-1)![0]);
  const lastInit = () => fetchMock.mock.calls.at(-1)![1]!;
  return { repo, fetchMock, lastUrl, lastInit };
}

const page = { offset: 20, limit: 10 };

describe("ApiCatalogRepository.search", () => {
  it("calls GET /catalog/books with the bearer token and a 60 s revalidate", async () => {
    const { repo, lastUrl, lastInit } = setup();

    const result = await repo.search({ kind: "keywords", words: ["borges", "ficciones"] }, NO_FILTERS, page);

    expect(lastUrl().origin + lastUrl().pathname).toBe("http://api.internal/catalog/books");
    expect(Object.fromEntries(lastUrl().searchParams)).toEqual({ q: "borges ficciones", offset: "20", limit: "10" });
    expect(lastInit().headers).toMatchObject({ Authorization: "Bearer s3cret" });
    expect(lastInit().next).toEqual({ revalidate: 60 });
    expect(result.total).toBe(41);
  });

  it("maps the API book onto the domain book (code = ISBN, always immediate, no promotion)", async () => {
    const { repo } = setup();

    const { items } = await repo.search(null, NO_FILTERS, page);

    expect(items[0]).toEqual({
      code: "9788466331234",
      isbn: "9788466331234",
      title: "Ficciones",
      author: "Borges, Jorge Luis",
      publisher: "Debolsillo",
      listPrice: 1_738_000,
      priceDate: "2026-11-04",
      recommendedAge: null,
      availability: "immediate",
      subject: null,
      year: 2011,
      language: "Español",
      pages: 224,
      review: "Cuentos.",
      promotion: null,
    });
  });

  it("sends author and publisher filters", async () => {
    const { repo, lastUrl } = setup();

    await repo.search(null, { ...NO_FILTERS, author: "cortázar", publisher: "Alfaguara" }, page);

    expect(lastUrl().searchParams.get("author")).toBe("cortázar");
    expect(lastUrl().searchParams.get("publisher")).toBe("Alfaguara");
    expect(lastUrl().searchParams.has("q")).toBe(false);
  });

  it.each<[SearchQuery, Record<string, string>]>([
    [{ kind: "isbn", isbn: "9788466331234" }, { q: "9788466331234" }],
    [
      {
        kind: "contains",
        criteria: [
          { field: "title", text: "cuentos" },
          { field: "author", text: "quiroga" },
          { field: "publisher", text: "losada" },
        ],
      },
      { q: "cuentos", author: "quiroga", publisher: "losada" },
    ],
    // Legacy positional shortcuts degrade to "contains".
    [{ kind: "position", field: "author", text: "BORGES" }, { author: "BORGES" }],
    [{ kind: "position", field: "title", text: "CASA" }, { q: "CASA" }],
    [{ kind: "position", field: "publisher", text: "ANAG" }, { publisher: "ANAG" }],
    [{ kind: "position", field: "code", text: "9788466331234" }, { q: "9788466331234" }],
  ])("maps %o onto API params", async (query, expected) => {
    const { repo, lastUrl } = setup();

    await repo.search(query, NO_FILTERS, page);

    const params = Object.fromEntries(lastUrl().searchParams);
    delete params.offset;
    delete params.limit;
    expect(params).toEqual(expected);
  });

  it("combines an author shortcut with the author filter", async () => {
    const { repo, lastUrl } = setup();
    await repo.search({ kind: "position", field: "author", text: "borges" }, { ...NO_FILTERS, author: "jorge" }, page);
    expect(lastUrl().searchParams.get("author")).toBe("jorge borges");
  });

  it("returns nothing, without calling the API, for filters real books never match", async () => {
    for (const filters of [
      { ...NO_FILTERS, subject: "Cuentos" },
      { ...NO_FILTERS, promotionOnly: true },
    ]) {
      const { repo, fetchMock } = setup();
      expect(await repo.search(null, filters, page)).toEqual({ items: [], total: 0 });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  });

  it("omits the Authorization header when no token is configured (local API)", async () => {
    const { repo, lastInit } = setup(undefined, "");
    await repo.search(null, NO_FILTERS, page);
    expect(lastInit().headers).not.toHaveProperty("Authorization");
  });

  it("raises CatalogUnavailableError on 503 (e.g. no exchange rate)", async () => {
    const { repo } = setup(() => json({ statusCode: 503, error: "exchange_rate_missing" }, 503));
    await expect(repo.search(null, NO_FILTERS, page)).rejects.toEqual(new CatalogUnavailableError("exchange_rate_missing"));
  });

  it("raises a plain error on other failures", async () => {
    const { repo } = setup(() => json({ error: "unauthorized" }, 401));
    await expect(repo.search(null, NO_FILTERS, page)).rejects.toThrow(/401/);
  });
});

describe("ApiCatalogRepository lookups", () => {
  it("finds a book by ISBN and returns null on 404", async () => {
    const found = setup(() => json(DTO));
    expect((await found.repo.findByIsbn("9788466331234"))?.title).toBe("Ficciones");
    expect(found.lastUrl().pathname).toBe("/catalog/books/9788466331234");

    const missing = setup(() => json({ error: "book_not_found" }, 404));
    expect(await missing.repo.findByIsbn("9780000000000")).toBeNull();
  });

  it("treats the code as the ISBN and skips the API for anything else", async () => {
    const { repo, fetchMock, lastUrl } = setup(() => json(DTO));
    expect((await repo.findByCode("9788466331234"))?.code).toBe("9788466331234");
    expect(lastUrl().pathname).toBe("/catalog/books/9788466331234");

    fetchMock.mockClear();
    expect(await repo.findByCode("100000")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reads facets: real data has no subjects or promotions and is always available", async () => {
    const { repo, lastUrl } = setup(() => json({ publishers: ["Anagrama", "Paidós"] }));
    expect(await repo.facets()).toEqual({
      publishers: ["Anagrama", "Paidós"],
      subjects: [],
      availabilities: ["immediate"],
      hasPromotions: false,
    });
    expect(lastUrl().pathname).toBe("/catalog/facets");
  });
});
