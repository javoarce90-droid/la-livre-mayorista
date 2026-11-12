export const LOGIN_PATH = "/login";
export const FORGOT_PASSWORD_PATH = "/login/olvide";
/** Set or change the password (after an invitation or a recovery email). */
export const SET_PASSWORD_PATH = "/cuenta/clave";
/** Route Handler that exchanges email links (token_hash) for a session. */
export const CONFIRM_EMAIL_PATH = "/auth/confirm";
/** Route Handler that signs out from places that cannot write cookies (Server Components). */
export const SIGN_OUT_PATH = "/auth/salir";

/** Notices shown on the login page, passed as `?error=`. */
export const LOGIN_NOTICES = ["sin_cuenta", "enlace_invalido"] as const;
export type LoginNotice = (typeof LOGIN_NOTICES)[number];

export function loginNoticePath(notice: LoginNotice): string {
  return `${LOGIN_PATH}?error=${notice}`;
}

export function isLoginNotice(value: unknown): value is LoginNotice {
  return typeof value === "string" && (LOGIN_NOTICES as readonly string[]).includes(value);
}

/** Pages reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === FORGOT_PASSWORD_PATH || pathname.startsWith("/auth/");
}
