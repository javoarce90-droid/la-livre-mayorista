/**
 * Only same-site relative paths are followed after sign-in or an email link:
 * anything else (absolute URLs, protocol-relative `//host`, `/\host`, control
 * characters) falls back, so `next` can never become an open redirect.
 */
export function safeRedirectPath(value: unknown, fallback: string): string {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  if (value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}
