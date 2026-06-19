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
        <p className="mt-1 text-sm text-muted-foreground">
          Per-page SEO overrides for the static customer routes — title,
          description, keywords, and whether search engines may index the page.
        </p>
      </header>

      {(!pages || pages.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">No pages seeded yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Apply migration <code>20260101001200_seo_metadata.sql</code> to seed the
            page table.
          </p>
        </div>
      )}

      {pages && pages.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Label</th>
                <th className="px-4 py-3">Path</th>
                <th className="px-4 py-3">Title override</th>
                <th className="px-4 py-3">Indexed</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pages.map((p) => (
                <tr key={p.id} className="hover:bg-muted">
                  <td className="px-4 py-3 font-medium text-foreground">{p.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.path}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-muted-foreground">
                    {p.meta_title ?? <span className="text-muted-foreground">— default —</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        p.robots_index
                          ? 'bg-green-100 text-green-800'
                          : 'bg-muted text-secondary-foreground'
                      }`}
                    >
                      {p.robots_index ? 'Indexed' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(p.updated_at).toLocaleDateString('en-GY', {
                      dateStyle: 'medium',
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/pages/${p.id}/edit`}
                      className="text-xs font-medium text-primary hover:underline"
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
