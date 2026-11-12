import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseConfig } from "./supabase-config";

/** Headers Supabase asks to set with auth cookies so CDNs never cache a session. */
const CACHE_HEADERS = ["cache-control", "expires", "pragma"] as const;

/** Minimal client factory signature, injectable in tests. */
export type CreateProxyClient = (
  url: string,
  key: string,
  options: { cookies: Required<Pick<CookieMethodsServer, "getAll" | "setAll">> },
) => { auth: { getClaims(): Promise<{ data: { claims: object } | null; error: unknown }> } };

/**
 * Proxy step required by @supabase/ssr: refreshes an expired access token and
 * writes the new cookies to both the request (for Server Components) and the
 * response (for the browser). Returns the response that must be sent on.
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  config: SupabaseConfig,
  createClient: CreateProxyClient = createServerClient as unknown as CreateProxyClient,
): Promise<{ response: NextResponse; signedIn: boolean }> {
  let response = NextResponse.next({ request });

  const supabase = createClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between creating the client and getClaims(): it is what
  // refreshes the session (and verifies the JWT signature).
  const { data } = await supabase.auth.getClaims();
  return { response, signedIn: Boolean(data?.claims) };
}

/** A redirect that still carries the refreshed session cookies and cache headers. */
export function redirectKeepingSession(url: URL, session: NextResponse): NextResponse {
  const redirect = NextResponse.redirect(url);
  session.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of CACHE_HEADERS) {
    const value = session.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
