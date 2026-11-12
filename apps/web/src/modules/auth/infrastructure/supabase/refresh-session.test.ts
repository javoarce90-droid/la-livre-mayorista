import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { redirectKeepingSession, refreshSupabaseSession, type CreateProxyClient } from "./refresh-session";

const config = { url: "https://project.supabase.co", publishableKey: "sb_publishable_x" };

function request(path = "/libros") {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  req.cookies.set("sb-project-auth-token", "old");
  return req;
}

/** Fake client: getClaims optionally triggers a refresh that writes cookies. */
function fakeClient({ claims, refresh }: { claims: object | null; refresh: boolean }): CreateProxyClient {
  return (_url, _key, { cookies }) => ({
    auth: {
      getClaims: vi.fn(async () => {
        expect(cookies.getAll()).toEqual([{ name: "sb-project-auth-token", value: "old" }]);
        if (refresh) {
          cookies.setAll([{ name: "sb-project-auth-token", value: "new", options: { path: "/", httpOnly: false } }], {
            "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
            Expires: "0",
            Pragma: "no-cache",
          });
        }
        return { data: claims ? { claims } : null, error: null };
      }),
    },
  });
}

describe("refreshSupabaseSession", () => {
  it("reports a signed-in user and passes refreshed cookies to the page and the browser", async () => {
    const req = request();
    const { response, signedIn } = await refreshSupabaseSession(req, config, fakeClient({ claims: { sub: "u-1" }, refresh: true }));

    expect(signedIn).toBe(true);
    expect(req.cookies.get("sb-project-auth-token")?.value).toBe("new");
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe("new");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("reports an anonymous visitor when there are no verified claims", async () => {
    const { signedIn } = await refreshSupabaseSession(request(), config, fakeClient({ claims: null, refresh: false }));
    expect(signedIn).toBe(false);
  });
});

describe("redirectKeepingSession", () => {
  it("copies the session cookies and cache headers onto the redirect", () => {
    const session = NextResponse.next();
    session.cookies.set("sb-project-auth-token", "", { maxAge: 0 });
    session.headers.set("cache-control", "no-store");

    const redirect = redirectKeepingSession(new URL("http://localhost:3000/login"), session);

    expect(redirect.status).toBe(307);
    expect(redirect.headers.get("location")).toBe("http://localhost:3000/login");
    expect(redirect.cookies.get("sb-project-auth-token")).toBeDefined();
    expect(redirect.headers.get("cache-control")).toBe("no-store");
  });
});
