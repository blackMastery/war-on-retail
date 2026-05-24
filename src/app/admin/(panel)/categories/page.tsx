import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Admin · Categories' };

export default async function AdminCategoriesPage() {
  const supabase = createAdminClient();
  const { data: cats } = await supabase
    .from('categories')
    .select('*')
    .order('display_order');
  // Build a slug → name lookup so we can display parent names without joining.
  const byId = new Map(cats?.map((c) => [c.id, c.name]) ?? []);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-gray-500">
          Manage the taxonomy seeded in <code>20260101000300_seed_taxonomy.sql</code>.
        </p>
      </header>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Parent</th>
              <th className="px-4 py-3 text-right">Order</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cats?.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{c.slug}</td>
                <td className="px-4 py-3 text-gray-700">
                  {c.parent_id ? byId.get(c.parent_id) ?? '—' : '—'}
                </td>
                <td className="px-4 py-3 text-right">{c.display_order}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {c.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-500">
        Inline editing for categories is on the roadmap. For now, manage them via the Supabase
        dashboard or seed SQL.
      </p>
    </div>
  );
}
