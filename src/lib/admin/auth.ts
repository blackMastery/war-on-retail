import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { DASHBOARD_KEY, isSuperAdminOnlyKey } from '@/lib/admin/pages';

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

export type AdminVia = 'db' | 'env-bootstrap';

export type AdminCheck = {
  ok: boolean;
  reason?: 'no-session' | 'not-authorised';
  via?: AdminVia;
};

/**
 * Resolved authorisation context for an admin request: who they are, how they
 * got in, their role, and which page keys they may enter.
 *
 * `isFullAccess` short-circuits all per-page checks — true for super_admins and
 * for env-bootstrap admins (so the very first owner can never lock themselves
 * out of the Team page before any DB row exists).
 */
export type AdminContext = {
  user: User;
  via: AdminVia;
  role: 'admin' | 'super_admin';
  isFullAccess: boolean;
  /** Granted page keys (excludes the always-allowed dashboard). */
  allowedPages: Set<string>;
};

type AdminLookup = {
  via: AdminVia;
  role: 'admin' | 'super_admin';
  allowedPages: Set<string>;
};

/**
 * Decides whether a Supabase auth user (looked up by id + email) is allowed
 * into /admin, and gathers their role + page grants. Source of truth is
 * `public.admin_users` (active row matched by id) plus `admin_user_pages`.
 * `ADMIN_ALLOWED_EMAILS` is honoured as a *bootstrap* fallback so the very
 * first admin can sign in before any DB row exists; such admins are treated as
 * full access.
 */
async function lookupAdmin(
  userId: string,
  email: string | null | undefined,
): Promise<AdminLookup | null> {
  // DB check — runs as service_role so RLS doesn't matter, and so we don't care
  // whether the user's own row policy lets them see themselves.
  const sb = createAdminClient();
  const { data, error } = await sb
    .from('admin_users')
    .select('id, is_active, role')
    .eq('id', userId)
    .maybeSingle();
  if (error) {
    console.error('[admin/auth] admin_users lookup failed', error);
  }

  if (data?.is_active) {
    const role = data.role;
    // super_admins have full access regardless of grants — skip the join.
    let allowedPages = new Set<string>();
    if (role !== 'super_admin') {
      const { data: grants, error: grantErr } = await sb
        .from('admin_user_pages')
        .select('page_key')
        .eq('admin_user_id', userId);
      if (grantErr) {
        console.error('[admin/auth] admin_user_pages lookup failed', grantErr);
      }
      allowedPages = new Set((grants ?? []).map((g) => g.page_key));
    }
    return { via: 'db', role, allowedPages };
  }

  // Bootstrap fallback — env allow-list. Treated as a full-access super_admin.
  if (isEnvAllowed(email)) {
    return { via: 'env-bootstrap', role: 'super_admin', allowedPages: new Set() };
  }

  return null;
}

function toContext(user: User, lookup: AdminLookup): AdminContext {
  const isFullAccess = lookup.role === 'super_admin' || lookup.via === 'env-bootstrap';
  return {
    user,
    via: lookup.via,
    role: lookup.role,
    isFullAccess,
    allowedPages: lookup.allowedPages,
  };
}

/**
 * Server-side guard for admin Server Components and Server Actions. Middleware
 * already performs a coarser check at request time; this is the deep one.
 * Redirects to the login flow when the visitor isn't an active admin.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const lookup = await lookupAdmin(user.id, user.email);
  if (!lookup) redirect('/admin/login?error=not-authorised');

  return toContext(user, lookup);
}

/**
 * Deep guard for a specific admin section. Allows full-access admins, the
 * always-on dashboard, and admins holding the matching grant; otherwise sends
 * them back to the dashboard with a forbidden notice. Use at the top of every
 * `(panel)` Server Component and inside the section's server actions.
 */
export async function requirePageAccess(pageKey: string): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.isFullAccess) return ctx;

  // super_admin-only sections are never reachable without full access.
  if (isSuperAdminOnlyKey(pageKey)) redirect('/admin?error=forbidden');

  if (pageKey === DASHBOARD_KEY || ctx.allowedPages.has(pageKey)) return ctx;

  redirect('/admin?error=forbidden');
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
  const lookup = await lookupAdmin(user.id, user.email);
  if (!lookup) return { ok: false, reason: 'not-authorised' };
  return { ok: true, via: lookup.via };
}
