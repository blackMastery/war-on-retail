import Link from 'next/link';
import Pagination from '@/components/customer/Pagination';
import { createAdminClient } from '@/lib/supabase/admin';
import { paginate, parsePage } from '@/lib/pagination';
import { buildIlikeOrClause } from '@/lib/products/search';
import { formatPrice } from '@/lib/utils';
import DeleteButton from './DeleteButton';

export const metadata = { title: 'Admin · Products' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 10;

const STATUS_FILTERS = ['all', 'active', 'hidden'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const STOCK_FILTERS = ['all', 'in', 'out', 'low'] as const;
type StockFilter = (typeof STOCK_FILTERS)[number];

const STOCK_LABEL: Record<StockFilter, string> = {
  all: 'All',
  in: 'In stock',
  out: 'Out of stock',
  low: 'Low stock',
};

function parseStatus(raw: string | undefined): StatusFilter {
  return STATUS_FILTERS.includes(raw as StatusFilter) ? (raw as StatusFilter) : 'all';
}

function parseStock(raw: string | undefined): StockFilter {
  return STOCK_FILTERS.includes(raw as StockFilter) ? (raw as StockFilter) : 'all';
}

function filterHref({
  status,
  stock,
  category,
  brand,
  q,
}: {
  status: StatusFilter;
  stock: StockFilter;
  category: string;
  brand: string;
  q: string;
}): string {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (stock !== 'all') params.set('stock', stock);
  if (category) params.set('category', category);
  if (brand) params.set('brand', brand);
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `/admin/products?${qs}` : '/admin/products';
}

function buildBaseQuery({
  status,
  stock,
  category,
  brand,
  q,
}: {
  status: StatusFilter;
  stock: StockFilter;
  category: string;
  brand: string;
  q: string;
}): string {
  const parts: string[] = [];
  if (status !== 'all') parts.push(`status=${encodeURIComponent(status)}`);
  if (stock !== 'all') parts.push(`stock=${encodeURIComponent(stock)}`);
  if (category) parts.push(`category=${encodeURIComponent(category)}`);
  if (brand) parts.push(`brand=${encodeURIComponent(brand)}`);
  if (q) parts.push(`q=${encodeURIComponent(q)}`);
  return parts.join('&');
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    status?: string;
    stock?: string;
    category?: string;
    brand?: string;
  }>;
}) {
  const sp = await searchParams;
  const requestedPage = parsePage(sp.page);
  const q = (sp.q ?? '').trim();
  const status = parseStatus(sp.status);
  const stock = parseStock(sp.stock);
  const category = sp.category ?? '';
  const brand = sp.brand ?? '';
  const hasFilters =
    q !== '' || status !== 'all' || stock !== 'all' || category !== '' || brand !== '';
  const offset = (requestedPage - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('brands').select('id, name').order('name'),
  ]);

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (q) query = query.or(buildIlikeOrClause(q));
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'hidden') query = query.eq('is_active', false);
  if (category) query = query.eq('category_id', category);
  if (brand) query = query.eq('brand_id', brand);
  if (stock === 'in') {
    query = query.or('track_inventory.eq.false,stock_quantity.gt.0');
  } else if (stock === 'out') {
    query = query.eq('track_inventory', true).lte('stock_quantity', 0);
  } else if (stock === 'low') {
    query = query.eq('track_inventory', true).gt('stock_quantity', 0).lte('stock_quantity', 5);
  }

  const { data: products, count } = await query.range(offset, offset + PAGE_SIZE - 1);

  const pag = paginate({
    requestedPage,
    count,
    rows: products ?? [],
    pageSize: PAGE_SIZE,
  });

  // Resolve category/brand names without using a PostgREST join — keeps the
  // typed schema simple and avoids relation-inference errors.
  const catIds = Array.from(new Set(products?.map((p) => p.category_id).filter(Boolean))) as string[];
  const brandIds = Array.from(new Set(products?.map((p) => p.brand_id).filter(Boolean))) as string[];
  const [{ data: cats }, { data: brandRows }] = await Promise.all([
    catIds.length
      ? supabase.from('categories').select('id, name').in('id', catIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    brandIds.length
      ? supabase.from('brands').select('id, name').in('id', brandIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const brandName = new Map((brandRows ?? []).map((b) => [b.id, b.name]));

  const baseQuery = buildBaseQuery({ status, stock, category, brand, q });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {pag.count === 0
              ? hasFilters
                ? 'No products match these filters.'
                : 'No products yet.'
              : pag.count <= PAGE_SIZE
                ? `${pag.count} ${pag.count === 1 ? 'product' : 'products'}`
                : `Showing ${pag.firstIdx}–${pag.lastIdx} of ${pag.count}`}
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="shrink-0 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          + New product
        </Link>
      </header>

      <div className="space-y-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => {
              const href = filterHref({ status: s, stock, category, brand, q });
              const isActive = status === s;
              return (
                <Link
                  key={s}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {s}
                </Link>
              );
            })}
          </nav>
          <nav className="flex flex-wrap gap-1" aria-label="Filter by stock">
            {STOCK_FILTERS.map((s) => {
              const href = filterHref({ status, stock: s, category, brand, q });
              const isActive = stock === s;
              return (
                <Link
                  key={s}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {STOCK_LABEL[s]}
                </Link>
              );
            })}
          </nav>
        </div>

        <form className="flex flex-wrap items-end gap-2" action="/admin/products" method="get">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          {stock !== 'all' && <input type="hidden" name="stock" value={stock} />}
          <div>
            <label htmlFor="admin-products-category" className="sr-only">
              Category
            </label>
            <select
              id="admin-products-category"
              name="category"
              defaultValue={category}
              className="rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
            >
              <option value="">All categories</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="admin-products-brand" className="sr-only">
              Brand
            </label>
            <select
              id="admin-products-brand"
              name="brand"
              defaultValue={brand}
              className="rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
            >
              <option value="">All brands</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-0 flex-1">
            <label htmlFor="admin-products-q" className="sr-only">
              Search products
            </label>
            <input
              id="admin-products-q"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by name, SKU, or description…"
              className="block w-full max-w-md rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted"
          >
            Apply
          </button>
          {hasFilters && (
            <Link
              href="/admin/products"
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-secondary-foreground"
            >
              Clear all
            </Link>
          )}
        </form>
      </div>

      {(!products || products.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            {hasFilters ? 'No products match your filters' : 'No products yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? 'Try a different search term or filter.'
              : 'Create your first product to get started.'}
          </p>
        </div>
      )}

      {products && products.length > 0 && (
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
              {products.map((p) => (
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
      )}

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery={baseQuery}
        basePath="/admin/products"
      />
    </div>
  );
}
