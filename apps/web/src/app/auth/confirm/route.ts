import { NextResponse, type NextRequest } from "next/server";
import { container } from "@/composition";
import { confirmEmailLink } from "@/modules/auth/application/auth-use-cases";

/**
 * Target of the invitation and recovery emails:
 * `/auth/confirm?token_hash=…&type=invite|recovery&next=/cuenta/clave`.
 * Verifying the token hash starts the session (cookies set through `cookies()`).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const path = await confirmEmailLink(container().auth, {
    tokenHash: searchParams.get("token_hash"),
    type: searchParams.get("type"),
    next: searchParams.get("next"),
  });
  return NextResponse.redirect(new URL(path, request.url));
}
