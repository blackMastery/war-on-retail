import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Resolves admin user ids → display labels for the audit UI.
 *
 * `created_by` / `modified_by` / `status_updated_by` are plain uuids (no FK), so
 * an id may not resolve — e.g. an env-bootstrap admin with no `admin_users` row,
 * or a deleted admin. Callers handle "missing" via the returned map: a present
 * id maps to `full_name` (or email); an absent one should display "Unknown".
 *
 * One batched query for however many ids the page needs (usually 1–3).
 */
export async function getAdminNameMap(
  ids: (string | null | undefined)[],
): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  const map = new Map<string, string>();
  if (unique.length === 0) return map;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, full_name, email')
    .in('id', unique);
  if (error) {
    console.error('[admin/audit] name lookup failed', error);
    return map;
  }
  for (const row of data ?? []) {
    map.set(row.id, row.full_name?.trim() || row.email || 'Unknown');
  }
  return map;
}

/** Renders an id via the map: present → label, missing id → "Unknown", null → "—". */
export function labelFor(
  id: string | null | undefined,
  map: Map<string, string>,
): string {
  if (!id) return '—';
  return map.get(id) ?? 'Unknown';
}

/** Shared date format for audit lines (matches the order pages). */
export function formatAuditDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return d.toLocaleString('en-GY', { dateStyle: 'medium', timeStyle: 'short' });
}
