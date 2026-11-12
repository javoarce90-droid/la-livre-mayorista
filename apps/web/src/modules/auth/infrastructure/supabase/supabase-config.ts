export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

/**
 * Supabase Auth is enabled only when both public variables are set; otherwise
 * the app falls back to the in-memory demo auth (tests, offline development).
 */
export function readSupabaseConfig(env: Partial<Record<string, string>>): SupabaseConfig | null {
  const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  return url && publishableKey ? { url, publishableKey } : null;
}
