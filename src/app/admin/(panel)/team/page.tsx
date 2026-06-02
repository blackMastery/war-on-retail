import { requirePageAccess } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import TeamManager, { type TeamMember } from '@/components/admin/TeamManager';

export const metadata = { title: 'Admin · Team' };
export const dynamic = 'force-dynamic';

/**
 * Owner-only access management. Lists every admin alongside their role and the
 * sections they may enter, and lets a super_admin add admins, change roles,
 * (de)activate them, and toggle per-page grants. `requirePageAccess('team')`
 * already restricts this to full-access admins.
 */
export default async function AdminTeamPage() {
  await requirePageAccess('team');

  const sb = createAdminClient();
  const [{ data: admins }, { data: grants }] = await Promise.all([
    sb.from('admin_users').select('*').order('created_at'),
    sb.from('admin_user_pages').select('admin_user_id, page_key'),
  ]);

  const pagesByUser = new Map<string, string[]>();
  for (const g of grants ?? []) {
    const list = pagesByUser.get(g.admin_user_id) ?? [];
    list.push(g.page_key);
    pagesByUser.set(g.admin_user_id, list);
  }

  const members: TeamMember[] = (admins ?? []).map((a) => ({
    id: a.id,
    email: a.email,
    full_name: a.full_name,
    role: a.role,
    is_active: a.is_active,
    pages: pagesByUser.get(a.id) ?? [],
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage who can sign in to admin and which sections they can use. Super
          admins have full access; regular admins only see the sections you grant
          them. New admins must sign in once at <code>/admin/login</code> before
          they can be added here.
        </p>
      </header>
      <TeamManager members={members} />
    </div>
  );
}
