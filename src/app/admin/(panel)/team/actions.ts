'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { GRANTABLE_KEYS } from '@/lib/admin/pages';

export type TeamFormState = {
  error?: string;
  saved?: boolean;
  /** Human-readable success detail (e.g. whether a new login was created). */
  message?: string;
  fieldErrors?: Record<string, string>;
};

const MIN_PASSWORD_LEN = 8;

const RoleEnum = z.enum(['admin', 'super_admin']);

/** Count the active super_admins so we never lock the store out of Team. */
async function activeSuperAdminCount(sb: ReturnType<typeof createAdminClient>): Promise<number> {
  const { count } = await sb
    .from('admin_users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'super_admin')
    .eq('is_active', true);
  return count ?? 0;
}

const AddAdminInput = z.object({
  email: z.string().email('Must be a valid email'),
  full_name: z.string().min(1, 'Name is required'),
  role: RoleEnum,
  password: z
    .string()
    .min(MIN_PASSWORD_LEN, `Password must be at least ${MIN_PASSWORD_LEN} characters`),
});

/**
 * Onboards an admin entirely from the UI: creates a Supabase auth login with
 * the chosen password (confirmed immediately so they can sign in right away),
 * then promotes them via the `make_admin` RPC. If a login already exists for
 * the email we skip creation — their existing password is left untouched — and
 * just promote. Mirrors `scripts/create-admin.ts`.
 */
export async function addAdmin(_prev: TeamFormState, fd: FormData): Promise<TeamFormState> {
  await requirePageAccess('team');

  const parsed = AddAdminInput.safeParse({
    email: fd.get('email'),
    full_name: fd.get('full_name'),
    role: fd.get('role'),
    password: fd.get('password'),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join('.')] = issue.message;
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const { full_name, role, password } = parsed.data;
  const email = parsed.data.email.trim().toLowerCase();
  const sb = createAdminClient();

  // 1. Create the auth login. `email_confirm: true` skips the confirmation
  //    email so the password works on first sign-in. A duplicate email is not
  //    an error here — we fall through to promotion and leave their password
  //    alone.
  const created = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  const alreadyExisted = !!created.error && /already (registered|exists)/i.test(created.error.message);
  if (created.error && !alreadyExisted) {
    return { error: `Couldn’t create the login: ${created.error.message}` };
  }

  // 2. Promote to admin (idempotent — ON CONFLICT DO UPDATE).
  const { error } = await sb.rpc('make_admin', {
    p_email: email,
    p_full_name: full_name.trim(),
    p_role: role,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin/team');
  return {
    saved: true,
    message: alreadyExisted
      ? `${email} already had a login — promoted to ${role.replace('_', ' ')}. Their existing password is unchanged.`
      : `Created a login for ${email}. They can sign in now with the password you set.`,
  };
}

const UpdateMemberInput = z.object({
  admin_user_id: z.string().uuid('Bad admin id'),
  role: RoleEnum,
  is_active: z.boolean(),
  pages: z.array(z.string()),
});

/**
 * Saves one admin's role, active flag, and page grants in a single submit.
 * A `super_admin` ignores per-page grants (full access), so we clear any rows
 * for them to keep the table tidy. Guards against removing the last active
 * super_admin (by demotion or deactivation), which would lock the Team page.
 */
export async function updateMember(_prev: TeamFormState, fd: FormData): Promise<TeamFormState> {
  await requirePageAccess('team');

  const parsed = UpdateMemberInput.safeParse({
    admin_user_id: fd.get('admin_user_id'),
    role: fd.get('role'),
    is_active: fd.get('is_active') === 'on' || fd.get('is_active') === 'true',
    pages: fd.getAll('pages').map(String),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
  }

  const { admin_user_id, role, is_active } = parsed.data;
  // Drop unknown / non-grantable keys defensively.
  const pages = parsed.data.pages.filter((k) => GRANTABLE_KEYS.has(k));

  const sb = createAdminClient();

  // Lockout guard — only matters when this member is currently an active
  // super_admin and the change would strip that status.
  const { data: current } = await sb
    .from('admin_users')
    .select('role, is_active')
    .eq('id', admin_user_id)
    .maybeSingle();
  if (!current) return { error: 'That admin no longer exists.' };

  const wasActiveSuper = current.role === 'super_admin' && current.is_active;
  const willBeActiveSuper = role === 'super_admin' && is_active;
  if (wasActiveSuper && !willBeActiveSuper && (await activeSuperAdminCount(sb)) <= 1) {
    return { error: 'You can’t demote or deactivate the last active super admin.' };
  }

  const { error: updErr } = await sb
    .from('admin_users')
    .update({ role, is_active })
    .eq('id', admin_user_id);
  if (updErr) return { error: updErr.message };

  // Replace grants: clear, then insert the selected set (skipped for
  // super_admins, who bypass grants entirely).
  const { error: delErr } = await sb
    .from('admin_user_pages')
    .delete()
    .eq('admin_user_id', admin_user_id);
  if (delErr) return { error: delErr.message };

  if (role !== 'super_admin' && pages.length) {
    const { error: insErr } = await sb
      .from('admin_user_pages')
      .insert(pages.map((page_key) => ({ admin_user_id, page_key })));
    if (insErr) return { error: insErr.message };
  }

  revalidatePath('/admin/team');
  return { saved: true };
}
