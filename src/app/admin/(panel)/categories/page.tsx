import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import DeleteCategoryButton from './DeleteCategoryButton';

export const metadata = { title: 'Admin · Categories' };

export default async function AdminCategoriesPage() {
  const supabase = createAdminClient();

  const [{ data: cats }, { data: productRows }] = await Promise.all([
    supabase
      .from('categories')
      .select('*')
      .order('display_order')
      .order('name'),
    supabase
      .from('products')
      .select('category_id')
      .eq('is_active', true)
      .not('category_id', 'is', null),
  ]);

  const byId = new Map(cats?.map((c) => [c.id, c.name]) ?? []);
  const childCount = new Map<string, number>();
  const productCount = new Map<string, number>();
  for (const c of cats ?? []) {
    if (c.parent_id) childCount.set(c.parent_id, (childCount.get(c.parent_id) ?? 0) + 1);
  }
  for (const row of productRows ?? []) {
    if (!row.category_id) continue;
    productCount.set(row.category_id, (productCount.get(row.category_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hierarchy shown on{' '}
            <Link href="/categories" className="text-primary hover:underline">
              /categories
            </Link>
            . Use the Parent field on the form to nest sub-categories.
          </p>
        </div>
        <Link
          href="/admin/categories/new"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          + New category
        </Link>
      </header>

      {(!cats || cats.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">No categories yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start with top-level categories like Electronics, Home Appliances, etc.
          </p>
        </div>
      )}

      {cats && cats.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3 text-right">Subs</th>
                <th className="px-4 py-3 text-right">Products</th>
                <th className="px-4 py-3 text-right">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {cats.map((c) => {
                const childN = childCount.get(c.id) ?? 0;
                const prodN = productCount.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-muted">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {c.parent_id && <span className="text-muted-foreground">↳ </span>}
                      {c.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.slug}</td>
                    <td className="px-4 py-3 text-secondary-foreground">
                      {c.parent_id ? byId.get(c.parent_id) ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{childN}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{prodN}</td>
                    <td className="px-4 py-3 text-right">{c.display_order}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {c.is_active ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-3 text-xs">
                        <Link
                          href={`/admin/categories/${c.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteCategoryButton
                          id={c.id}
                          name={c.name}
                          isActive={c.is_active}
                          childCount={childN}
                          productCount={prodN}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
