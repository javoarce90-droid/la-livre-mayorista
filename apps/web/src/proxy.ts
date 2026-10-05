import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/modules/auth/infrastructure/session-cookie";

const PUBLIC_PATHS = new Set(["/login"]);

/**
 * Optimistic auth check: only looks at cookie presence. Pages and Server Actions
 * verify the signed session (see `portal-context.ts`), and `/login` redirects
 * signed-in users itself, so a stale cookie can never cause a redirect loop.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname) || request.cookies.has(SESSION_COOKIE)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
