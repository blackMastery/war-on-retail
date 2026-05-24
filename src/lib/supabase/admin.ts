import 'server-only';
import { createClient as createSbClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Service-role Supabase client — bypasses RLS.
 *
 * NEVER import this from a client component or expose its key in the browser.
 * Use only inside Route Handlers, Server Actions, and scripts that have access
 * to SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local before using admin mutations.',
    );
  }
  return createSbClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
