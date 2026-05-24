import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Refreshes the Supabase auth cookie on every request and gates `/admin`.
 *
 * Per Supabase guidance: do not put code between `createServerClient` and
 * `getUser()`, and always return the supabaseResponse object unchanged.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not remove this call — it refreshes the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Coarse gate: require a session for any /admin/* page except the login flow.
  // Authoritative admin authorisation (DB lookup against admin_users with env
  // bootstrap fallback) happens in `requireAdmin()` inside the panel layout —
  // doing it here too would mean a Supabase round-trip per request.
  const path = request.nextUrl.pathname;
  const needsSession =
    path.startsWith('/admin') &&
    !path.startsWith('/admin/login') &&
    !path.startsWith('/admin/auth');

  if (needsSession && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}
