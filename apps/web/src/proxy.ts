import { NextResponse, type NextRequest } from "next/server";
import { LOGIN_PATH, isPublicPath } from "@/modules/auth/domain/auth-paths";
import { SESSION_COOKIE } from "@/modules/auth/infrastructure/session-cookie";
import { redirectKeepingSession, refreshSupabaseSession } from "@/modules/auth/infrastructure/supabase/refresh-session";
import { readSupabaseConfig } from "@/modules/auth/infrastructure/supabase/supabase-config";

function loginUrl(request: NextRequest): URL {
  const { pathname, search } = request.nextUrl;
  const login = new URL(LOGIN_PATH, request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return login;
}

/**
 * First auth filter. With Supabase it also refreshes the session (required by
 * @supabase/ssr, since Server Components cannot write cookies). Without it,
 * only the mock cookie's presence is checked. Pages and Server Actions verify
 * the session again (see `portal-context.ts`).
 */
export async function proxy(request: NextRequest) {
  const supabase = readSupabaseConfig(process.env);
  const publicPath = isPublicPath(request.nextUrl.pathname);

  if (!supabase) {
    if (publicPath || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
    return NextResponse.redirect(loginUrl(request));
  }

  const { response, signedIn } = await refreshSupabaseSession(request, supabase);
  if (signedIn || publicPath) return response;
  return redirectKeepingSession(loginUrl(request), response);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
