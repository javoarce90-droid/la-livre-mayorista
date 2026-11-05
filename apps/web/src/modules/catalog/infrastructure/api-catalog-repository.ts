import {
  CatalogUnavailableError,
  type CatalogFacets,
  type CatalogRepository,
  type SearchPage,
} from "../application/catalog-repository";
import type { Book } from "../domain/book";
import type { SearchFilters } from "../domain/search-filters";
import type { SearchField, SearchQuery } from "../domain/search-query";

/** Prices change when the owner updates the exchange rate or the feed is imported: keep them fresh. */
const REVALIDATE_SECONDS = 60;
const ISBN_PATTERN = /^\d{13}$/;

/** Book as served by the La Livre API (`GET /catalog/books`). */
interface BookDto {
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number | null;
  language: string | null;
  pages: number | null;
  description: string | null;
  coverUrl: string | null;
  /** Whole cents of `currency` (ARS). */
  priceCents: number;
  currency: string;
  priceUpdatedAt: string;
}

/** ISO 639-2 codes sent by the ONIX feed → display name. Unknown codes are shown as-is. */
const LANGUAGE_NAMES: Record<string, string> = {
  spa: "Español",
  cat: "Catalán",
  glg: "Gallego",
  eus: "Euskera",
  baq: "Euskera",
  eng: "Inglés",
  por: "Portugués",
  fra: "Francés",
  fre: "Francés",
  ita: "Italiano",
  deu: "Alemán",
  ger: "Alemán",
};

function toBook(dto: BookDto): Book {
  return {
    code: dto.isbn,
    isbn: dto.isbn,
    title: dto.title,
    author: dto.author,
    publisher: dto.publisher,
    listPrice: dto.priceCents,
    priceDate: dto.priceUpdatedAt.slice(0, 10),
    recommendedAge: null,
    // The API only lists immediately available books.
    availability: "immediate",
    subject: null,
    year: dto.year,
    language: dto.language ? (LANGUAGE_NAMES[dto.language] ?? dto.language.toUpperCase()) : null,
    pages: dto.pages,
    review: dto.description,
    promotion: null,
  };
}

interface ApiParams {
  q: string[];
  author: string[];
  publisher: string[];
}

function addCriterion(params: ApiParams, field: SearchField, text: string): void {
  switch (field) {
    case "author":
      params.author.push(text);
      return;
    case "publisher":
      params.publisher.push(text);
      return;
    // The API has no title-only or code-only filter: `q` also matches title and ISBN (code = ISBN).
    case "title":
    case "isbn":
    case "code":
      params.q.push(text);
  }
}

/**
 * SearchQuery → API params. The API only does "every word appears" matching, so:
 * - `+T`/`+I`/`+C` criteria go to `q` (which also matches author and publisher);
 * - legacy positional shortcuts (TCASA = "from CASA alphabetically", EANAG = prefix) degrade to contains.
 */
function toApiParams(query: SearchQuery | null, filters: SearchFilters): ApiParams {
  const params: ApiParams = { q: [], author: [], publisher: [] };
  if (filters.author.trim()) params.author.push(filters.author.trim());
  if (filters.publisher.trim()) params.publisher.push(filters.publisher.trim());
  switch (query?.kind) {
    case "keywords":
      params.q.push(...query.words);
      break;
    case "isbn":
      params.q.push(query.isbn);
      break;
    case "contains":
      query.criteria.forEach(({ field, text }) => addCriterion(params, field, text));
      break;
    case "position":
      addCriterion(params, query.field, query.text);
      break;
  }
  return params;
}

/** Real books have no subject and no promotion, so these filters can never match. */
function cannotMatch(filters: SearchFilters): boolean {
  return filters.subject.trim() !== "" || filters.promotionOnly;
}

export interface ApiCatalogRepositoryOptions {
  /** API_INTERNAL_URL (Vercel service binding). */
  baseUrl: string;
  /** API_INTERNAL_TOKEN; omitted against a local API without a token. */
  token?: string;
  fetch?: typeof fetch;
}

/** Server-side adapter of the catalog port against the La Livre API. Never import it from client code. */
export class ApiCatalogRepository implements CatalogRepository {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly fetch: typeof fetch;

  constructor({ baseUrl, token, fetch: fetchImpl = fetch }: ApiCatalogRepositoryOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token || undefined;
    this.fetch = fetchImpl;
  }

  async search(
    query: SearchQuery | null,
    filters: SearchFilters,
    page: { offset: number; limit: number },
  ): Promise<SearchPage> {
    if (cannotMatch(filters)) return { items: [], total: 0 };
    const params = toApiParams(query, filters);
    const search = new URLSearchParams();
    if (params.q.length) search.set("q", params.q.join(" "));
    if (params.author.length) search.set("author", params.author.join(" "));
    if (params.publisher.length) search.set("publisher", params.publisher.join(" "));
    search.set("offset", String(page.offset));
    search.set("limit", String(page.limit));

    const body = await this.get<{ items: BookDto[]; total: number }>(`/catalog/books?${search}`);
    return { items: body!.items.map(toBook), total: body!.total };
  }

  async facets(): Promise<CatalogFacets> {
    const body = await this.get<{ publishers: string[] }>("/catalog/facets");
    return { publishers: body!.publishers, subjects: [], availabilities: ["immediate"], hasPromotions: false };
  }

  async findByCode(code: string): Promise<Book | null> {
    return ISBN_PATTERN.test(code) ? this.findByIsbn(code) : null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    if (!ISBN_PATTERN.test(isbn)) return null;
    const dto = await this.get<BookDto>(`/catalog/books/${isbn}`, { notFoundAsNull: true });
    return dto ? toBook(dto) : null;
  }

  private async get<T>(path: string, { notFoundAsNull = false } = {}): Promise<T | null> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    const response = await this.fetch(`${this.baseUrl}${path}`, {
      headers,
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (response.ok) return (await response.json()) as T;
    if (response.status === 404 && notFoundAsNull) return null;

    const error = await response
      .json()
      .then((body: { error?: unknown }) => (typeof body.error === "string" ? body.error : null))
      .catch(() => null);
    if (response.status === 503) throw new CatalogUnavailableError(error ?? "service_unavailable");
    throw new Error(`Catalog API ${response.status} on ${path}${error ? ` (${error})` : ""}`);
  }
}
