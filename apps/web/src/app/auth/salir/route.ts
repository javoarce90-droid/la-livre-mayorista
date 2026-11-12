import { NextResponse, type NextRequest } from "next/server";
import { container } from "@/composition";
import { LOGIN_PATH, loginNoticePath } from "@/modules/auth/domain/auth-paths";

/**
 * Signs out from places that cannot write cookies (Server Components), e.g.
 * when the API reports that the signed-in user has no La Livre customer.
 */
export async function GET(request: NextRequest) {
  await container().auth.signOut();
  const target = request.nextUrl.searchParams.get("motivo") === "sin_cuenta" ? loginNoticePath("sin_cuenta") : LOGIN_PATH;
  return NextResponse.redirect(new URL(target, request.url));
}
