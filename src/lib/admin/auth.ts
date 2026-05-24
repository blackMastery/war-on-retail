import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

/** True when an email is on the env bootstrap allow-list. */
function isEnvAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  return allowed.includes(email.toLowerCase());
}

export type AdminCheck = {
  ok: boolean;
  reason?: 'no-session' | 'not-authorised';
  via?: 'db' | 'env-bootstrap';
};

/**
 * Decides whether a Supabase auth user (looked up by id + email) is allowed
 * into /admin. Source of truth is `public.admin_users` (active row matched by
 * id). `ADMIN_ALLOWED_EMAILS` is honoured as a *bootstrap* fallback so the
 * very first admin can sign in before any DB row exists; remove the email
 * from the env once you've called `select make_admin('…')` in SQL.
 */
async function isAdmin(userId: string, email: string | null | undefined): Promise<AdminCheck['via'] | null> {
  // 1. DB check — runs as service_role so RLS doesn't matter, and so we don't
  //    care whether the user's own row policy lets them see themselves.
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('admin_users')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[admin/auth] admin_users lookup failed', error);
  }
  if (data?.is_active) return 'db';

  // 2. Bootstrap fallback — env allow-list.
  if (isEnvAllowed(email)) return 'env-bootstrap';

  return null;
}

/**
 * Server-side guard for admin Server Components and Server Actions. Middleware
 * already performs a coarser check at request time; this is the deep one.
 */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const via = await isAdmin(user.id, user.email);
  if (!via) redirect('/admin/login?error=not-authorised');

  return { user, via };
}

/**
 * Non-throwing variant — useful for middleware-style checks where we want to
 * decide what to do based on the reason.
 */
export async function checkAdmin(): Promise<AdminCheck> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: 'no-session' };
  const via = await isAdmin(user.id, user.email);
  if (!via) return { ok: false, reason: 'not-authorised' };
  return { ok: true, via };
}
