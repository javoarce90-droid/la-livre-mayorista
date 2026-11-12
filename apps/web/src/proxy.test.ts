import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SESSION_COOKIE } from "@/modules/auth/infrastructure/session-cookie";
import { proxy } from "./proxy";

const getClaims = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    { cookies }: { cookies: { setAll: (cookies: { name: string; value: string; options: object }[], headers: object) => void } },
  ) => ({
    auth: {
      getClaims: async () => {
        // Simulates an expired session being cleared during the refresh.
        cookies.setAll([{ name: "sb-project-auth-token", value: "", options: { maxAge: 0 } }], {});
        return getClaims();
      },
    },
  }),
}));

function request(path: string, withSession = false) {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  if (withSession) req.cookies.set(SESSION_COOKIE, "token");
  return req;
}

describe("proxy (in-memory auth fallback)", () => {
  it("redirects anonymous visitors of portal routes to /login keeping the target", async () => {
    const response = await proxy(request("/pedido?x=1"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fpedido%3Fx%3D1");
  });

  it.each(["/login", "/login/olvide", "/auth/confirm?token_hash=x&type=invite"])("lets %s through", async (path) => {
    expect((await proxy(request(path))).headers.get("location")).toBeNull();
  });

  it("lets requests with a session cookie through", async () => {
    expect((await proxy(request("/dashboard", true))).headers.get("location")).toBeNull();
  });
});

describe("proxy (Supabase Auth)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    getClaims.mockReset();
  });

  function withSupabase() {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");
  }

  it("lets signed-in users through with the refreshed session", async () => {
    withSupabase();
    getClaims.mockResolvedValue({ data: { claims: { sub: "u-1" } }, error: null });

    const response = await proxy(request("/libros"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.cookies.get("sb-project-auth-token")).toBeDefined();
  });

  it("redirects anonymous visitors to /login?next= carrying the cleared session cookie", async () => {
    withSupabase();
    getClaims.mockResolvedValue({ data: null, error: null });

    const response = await proxy(request("/pedido"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?next=%2Fpedido");
    expect(response.cookies.get("sb-project-auth-token")).toBeDefined();
  });

  it("ignores the mock session cookie and keeps public pages open", async () => {
    withSupabase();
    getClaims.mockResolvedValue({ data: null, error: null });

    expect((await proxy(request("/dashboard", true))).headers.get("location")).toContain("/login");
    expect((await proxy(request("/auth/confirm"))).headers.get("location")).toBeNull();
  });
});
