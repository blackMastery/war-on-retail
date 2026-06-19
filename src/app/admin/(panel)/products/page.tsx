import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import DeleteButton from './DeleteButton';

export const metadata = { title: 'Admin · Products' };

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = '', page = '1' } = await searchParams;
  const supabase = createAdminClient();
  const perPage = 25;
  const offset = (Math.max(1, Number(page)) - 1) * perPage;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (q) query = query.ilike('name', `%${q}%`);
  const { data: products, count } = await query.range(offset, offset + perPage - 1);

  // Resolve category/brand names without using a PostgREST join — keeps the
  // typed schema simple and avoids relation-inference errors.
  const catIds = Array.from(new Set(products?.map((p) => p.category_id).filter(Boolean))) as string[];
  const brandIds = Array.from(new Set(products?.map((p) => p.brand_id).filter(Boolean))) as string[];
  const [{ data: cats }, { data: brands }] = await Promise.all([
    catIds.length
      ? supabase.from('categories').select('id, name').in('id', catIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    brandIds.length
      ? supabase.from('brands').select('id, name').in('id', brandIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const brandName = new Map((brands ?? []).map((b) => [b.id, b.name]));

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / perPage));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Products</h1>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          + New product
        </Link>
      </header>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search by name…"
          className="w-full max-w-md rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Search
        </button>
        {q && (
          <Link
            href="/admin/products"
            className="rounded-md px-4 py-2 text-sm font-medium text-muted-foreground hover:text-secondary-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(products ?? []).length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                  No products found.
                </td>
              </tr>
            )}
            {products?.map((p) => (
              <tr key={p.id} className="hover:bg-muted">
                <td className="px-4 py-3 font-medium text-foreground">
                  <Link href={`/admin/products/${p.id}/edit`} className="hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.sku ?? '—'}</td>
                <td className="px-4 py-3 text-secondary-foreground">
                  {p.category_id ? catName.get(p.category_id) ?? '—' : '—'}
                </td>
                <td className="px-4 py-3 text-secondary-foreground">
                  {p.brand_id ? brandName.get(p.brand_id) ?? '—' : '—'}
                </td>
                <td className="px-4 py-3 text-right">{formatPrice(p.price)}</td>
                <td className="px-4 py-3 text-right">
                  {p.track_inventory ? p.stock_quantity : '∞'}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {p.is_active ? 'Active' : 'Hidden'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <DeleteButton id={p.id} name={p.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="flex justify-center gap-2 text-sm">
          {Array.from({ length: totalPages }).map((_, i) => {
            const n = i + 1;
            const active = n === Number(page);
            return (
              <Link
                key={n}
                href={`/admin/products?${new URLSearchParams({ q, page: String(n) }).toString()}`}
                className={`rounded-md px-3 py-1.5 ${
                  active ? 'bg-primary text-primary-foreground' : 'bg-card text-secondary-foreground ring-1 ring-border'
                }`}
              >
                {n}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
