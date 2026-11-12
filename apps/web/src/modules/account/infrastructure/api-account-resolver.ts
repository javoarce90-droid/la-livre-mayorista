import type { SessionUser } from "@/modules/auth/domain/user";
import type { Result } from "@/shared/lib/result";
import { err, ok } from "@/shared/lib/result";
import type { AccountResolutionError, AccountResolver } from "../application/account-resolver";
import type { Account } from "../domain/account";

/** Customer as served by the La Livre API (`GET /me`). */
interface MeDto {
  id: string;
  email: string;
  businessName: string;
  taxId: string | null;
  phone: string | null;
  status: "ACTIVE" | "SUSPENDED";
}

/**
 * Only the customer record is real so far: branch, deposit, rubro, zone,
 * discount and the commercial flags have no source yet, so they get neutral
 * values (no discount, no consignment/promotions, Interior = explicit dispatch).
 */
function toAccount(dto: MeDto): Account {
  return {
    id: dto.id,
    bookstoreName: dto.businessName,
    email: dto.email,
    branch: "",
    deposit: "",
    rubro: "",
    zone: "Interior",
    discountPercent: 0,
    flags: {
      hasConsignment: false,
      hasPromotions: false,
      suspended: dto.status === "SUSPENDED",
      orderLocked: false,
    },
  };
}

export interface ApiAccountResolverOptions {
  /** API_INTERNAL_URL. */
  baseUrl: string;
  /** API_INTERNAL_TOKEN. */
  token?: string;
  fetch?: typeof fetch;
}

/** Server-side adapter: resolves the signed-in customer through `GET /me`. */
export class ApiAccountResolver implements AccountResolver {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly fetch: typeof fetch;

  constructor({ baseUrl, token, fetch: fetchImpl = fetch }: ApiAccountResolverOptions) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.token = token || undefined;
    this.fetch = fetchImpl;
  }

  async resolve(user: SessionUser): Promise<Result<Account, AccountResolutionError>> {
    if (!user.accessToken) return err("session_expired");
    const headers: Record<string, string> = { Accept: "application/json" };
    if (this.token) headers.Authorization = `Bearer ${this.token}`;
    headers["X-Customer-Token"] = user.accessToken;

    // Per-user data: never cached.
    const response = await this.fetch(`${this.baseUrl}/me`, { headers, cache: "no-store" });
    if (response.ok) return ok(toAccount((await response.json()) as MeDto));
    if (response.status === 403) return err("account_not_found");
    if (response.status === 401) return err("session_expired");

    const error = await response
      .json()
      .then((body: { error?: unknown }) => (typeof body.error === "string" ? body.error : null))
      .catch(() => null);
    throw new Error(`Account API ${response.status} on /me${error ? ` (${error})` : ""}`);
  }
}
