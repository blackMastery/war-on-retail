import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/**
 * Server Supabase client — call from Server Components, Route Handlers, and Server Actions.
 *
 * Uses the anon key + cookies, so RLS still applies. For admin mutations (which need
 * to bypass RLS) use `createAdminClient` from `./admin.ts` instead.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component, where cookie mutation is disallowed.
            // The middleware (src/middleware.ts) handles session refresh, so this is safe to ignore.
          }
        },
      },
    },
  );
}
