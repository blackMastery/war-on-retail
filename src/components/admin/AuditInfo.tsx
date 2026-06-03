import { getAdminNameMap, labelFor, formatAuditDate } from '@/lib/admin/audit';

/**
 * "Who / when" audit footer for admin edit pages. Resolves the `created_by` /
 * `modified_by` uuids to admin names and renders a subtle two-line summary.
 *
 * Async server component — does its own (batched) admin_users lookup, so an edit
 * page just passes the row's four audit fields.
 *
 * Graceful nulls: pre-existing rows (created before this feature, or updated via
 * a non-stamped path like store_settings) show "—" for the missing actor.
 */
export default async function AuditInfo({
  createdBy,
  modifiedBy,
  createdAt,
  updatedAt,
  className = '',
}: {
  createdBy: string | null;
  modifiedBy: string | null;
  createdAt: string;
  updatedAt: string;
  className?: string;
}) {
  const names = await getAdminNameMap([createdBy, modifiedBy]);

  return (
    <dl
      className={`grid gap-x-6 gap-y-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 sm:grid-cols-2 ${className}`}
    >
      <div className="flex gap-1">
        <dt className="font-medium text-gray-500">Created by</dt>
        <dd className="text-gray-700">
          {labelFor(createdBy, names)} · {formatAuditDate(createdAt)}
        </dd>
      </div>
      <div className="flex gap-1">
        <dt className="font-medium text-gray-500">Last modified by</dt>
        <dd className="text-gray-700">
          {labelFor(modifiedBy, names)} · {formatAuditDate(updatedAt)}
        </dd>
      </div>
    </dl>
  );
}
