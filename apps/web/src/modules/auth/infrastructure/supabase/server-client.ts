import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseConfig } from "./supabase-config";

/**
 * Supabase client bound to the current request's cookies, for Server
 * Components, Server Actions and Route Handlers. Create one per request.
 */
export async function createSupabaseServerClient(config: SupabaseConfig) {
  const cookieStore = await cookies();
  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot write cookies: the
          // proxy refreshes the session on every request instead.
        }
      },
    },
  });
}
