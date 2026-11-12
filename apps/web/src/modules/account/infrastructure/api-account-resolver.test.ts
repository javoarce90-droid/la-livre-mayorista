import { describe, expect, it, vi } from "vitest";
import { err } from "@/shared/lib/result";
import { ApiAccountResolver } from "./api-account-resolver";

const user = { id: "u-1", email: "compras@libreria.com", accessToken: "jwt" };
const me = {
  id: "0b6e1f7a-0000-4000-8000-000000000001",
  email: "compras@libreria.com",
  businessName: "Librería del Puerto",
  taxId: "20123456786",
  phone: null,
  status: "ACTIVE",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function resolver(response: Response) {
  const fetch = vi.fn(async () => response);
  return { fetch, accounts: new ApiAccountResolver({ baseUrl: "http://api/", token: "internal", fetch }) };
}

describe("ApiAccountResolver", () => {
  it("calls GET /me with the internal token and the user's access token, never cached", async () => {
    const { fetch, accounts } = resolver(json(200, me));

    await accounts.resolve(user);

    expect(fetch).toHaveBeenCalledWith("http://api/me", {
      headers: { Accept: "application/json", Authorization: "Bearer internal", "X-Customer-Token": "jwt" },
      cache: "no-store",
    });
  });

  it("maps the customer to an account with neutral defaults for fields without a source yet", async () => {
    const { accounts } = resolver(json(200, me));

    expect(await accounts.resolve(user)).toEqual({
      ok: true,
      value: {
        id: me.id,
        bookstoreName: "Librería del Puerto",
        email: "compras@libreria.com",
        branch: "",
        deposit: "",
        rubro: "",
        zone: "Interior",
        discountPercent: 0,
        flags: { hasConsignment: false, hasPromotions: false, suspended: false, orderLocked: false },
      },
    });
  });

  it("marks suspended customers", async () => {
    const { accounts } = resolver(json(200, { ...me, status: "SUSPENDED" }));
    const result = await accounts.resolve(user);
    expect(result.ok && result.value.flags.suspended).toBe(true);
  });

  it("returns account_not_found on 403 and session_expired on 401 or without a token", async () => {
    expect(await resolver(json(403, { error: "customer_not_found" })).accounts.resolve(user)).toEqual(
      err("account_not_found"),
    );
    expect(await resolver(json(401, { error: "invalid_customer_token" })).accounts.resolve(user)).toEqual(
      err("session_expired"),
    );

    const { fetch, accounts } = resolver(json(200, me));
    expect(await accounts.resolve({ ...user, accessToken: null })).toEqual(err("session_expired"));
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws on other API failures", async () => {
    await expect(
      resolver(json(503, { error: "customer_auth_unavailable" })).accounts.resolve(user),
    ).rejects.toThrow(/503.*customer_auth_unavailable/);
  });
});
