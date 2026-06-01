import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Admin · Pages' };
export const dynamic = 'force-dynamic';

export default async function AdminPagesPage() {
  const supabase = createAdminClient();
  const { data: pages } = await supabase
    .from('page_seo')
    .select('*')
    .order('path');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Pages</h1>
        <p className="mt-1 text-sm text-gray-600">
          Per-page SEO overrides for the static customer routes — title,
          description, keywords, and whether search engines may index the page.
        </p>
      </header>

      {(!pages || pages.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No pages seeded yet</p>
          <p className="mt-1 text-sm text-gray-600">
            Apply migration <code>20260101001200_seo_metadata.sql</code> to seed the
            page table.
          </p>
        </div>
      )}

      {pages && pages.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Title override</th>
                <th className="px-4 py-3">Indexed</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.path}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-gray-600">
                    {p.meta_title ?? <span className="text-gray-400">— default —</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.robots_index
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {p.robots_index ? 'Indexed' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(p.updated_at).toLocaleDateString('en-GY', {
                      dateStyle: 'medium',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/pages/${p.id}/edit`}
                      className="text-xs font-medium text-primary-600 hover:underline"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
