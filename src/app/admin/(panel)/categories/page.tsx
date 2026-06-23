import Link from 'next/link';
import Pagination from '@/components/customer/Pagination';
import { createAdminClient } from '@/lib/supabase/admin';
import { paginate, parsePage } from '@/lib/pagination';
import { buildIlikeOrClause } from '@/lib/products/search';
import DeleteCategoryButton from './DeleteCategoryButton';

export const metadata = { title: 'Admin · Categories' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 25;

const STATUS_FILTERS = ['all', 'active', 'hidden'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

const LEVEL_FILTERS = ['all', 'top', 'sub'] as const;
type LevelFilter = (typeof LEVEL_FILTERS)[number];

const LEVEL_LABEL: Record<LevelFilter, string> = {
  all: 'All',
  top: 'Top-level',
  sub: 'Subcategories',
};

function parseStatus(raw: string | undefined): StatusFilter {
  return STATUS_FILTERS.includes(raw as StatusFilter) ? (raw as StatusFilter) : 'all';
}

function parseLevel(raw: string | undefined): LevelFilter {
  return LEVEL_FILTERS.includes(raw as LevelFilter) ? (raw as LevelFilter) : 'all';
}

function filterHref({
  status,
  level,
  q,
}: {
  status: StatusFilter;
  level: LevelFilter;
  q: string;
}): string {
  const params = new URLSearchParams();
  if (status !== 'all') params.set('status', status);
  if (level !== 'all') params.set('level', level);
  if (q) params.set('q', q);
  const qs = params.toString();
  return qs ? `/admin/categories?${qs}` : '/admin/categories';
}

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string; level?: string }>;
}) {
  const sp = await searchParams;
  const requestedPage = parsePage(sp.page);
  const q = (sp.q ?? '').trim();
  const status = parseStatus(sp.status);
  const level = parseLevel(sp.level);
  const offset = (requestedPage - 1) * PAGE_SIZE;
  const hasFilters = q !== '' || status !== 'all' || level !== 'all';

  const supabase = createAdminClient();

  let query = supabase.from('categories').select('*', { count: 'exact' });
  if (q) query = query.or(buildIlikeOrClause(q, ['name', 'slug']));
  if (status === 'active') query = query.eq('is_active', true);
  if (status === 'hidden') query = query.eq('is_active', false);
  if (level === 'top') query = query.is('parent_id', null);
  if (level === 'sub') query = query.not('parent_id', 'is', null);

  const { data: cats, count } = await query
    .order('display_order')
    .order('name')
    .range(offset, offset + PAGE_SIZE - 1);

  const pag = paginate({
    requestedPage,
    count,
    rows: cats ?? [],
    pageSize: PAGE_SIZE,
  });

  const pageIds = (cats ?? []).map((c) => c.id);
  const parentIds = [...new Set((cats ?? []).map((c) => c.parent_id).filter(Boolean))] as string[];

  const parentById = new Map<string, string>();
  const childCount = new Map<string, number>();
  const productCount = new Map<string, number>();

  if (pageIds.length > 0) {
    const [parentResult, childResult, productResult] = await Promise.all([
      parentIds.length > 0
        ? supabase.from('categories').select('id, name').in('id', parentIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.from('categories').select('parent_id').in('parent_id', pageIds),
      supabase
        .from('products')
        .select('category_id')
        .eq('is_active', true)
        .in('category_id', pageIds),
    ]);

    for (const p of parentResult.data ?? []) {
      parentById.set(p.id, p.name);
    }
    for (const row of childResult.data ?? []) {
      if (!row.parent_id) continue;
      childCount.set(row.parent_id, (childCount.get(row.parent_id) ?? 0) + 1);
    }
    for (const row of productResult.data ?? []) {
      if (!row.category_id) continue;
      productCount.set(row.category_id, (productCount.get(row.category_id) ?? 0) + 1);
    }
  }

  const baseQueryParts: string[] = [];
  if (status !== 'all') baseQueryParts.push(`status=${encodeURIComponent(status)}`);
  if (level !== 'all') baseQueryParts.push(`level=${encodeURIComponent(level)}`);
  if (q) baseQueryParts.push(`q=${encodeURIComponent(q)}`);
  const baseQuery = baseQueryParts.join('&');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {pag.count === 0
              ? hasFilters
                ? 'No categories match these filters.'
                : 'No categories yet.'
              : pag.count <= PAGE_SIZE
                ? `${pag.count} ${pag.count === 1 ? 'category' : 'categories'}`
                : `Showing ${pag.firstIdx}–${pag.lastIdx} of ${pag.count}`}
          </p>
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
          className="shrink-0 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          + New category
        </Link>
      </header>

      <div className="space-y-3 rounded-lg bg-card p-3 shadow-sm ring-1 ring-border">
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
            {STATUS_FILTERS.map((s) => {
              const href = filterHref({ status: s, level, q });
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
          <nav className="flex flex-wrap gap-1" aria-label="Filter by hierarchy">
            {LEVEL_FILTERS.map((l) => {
              const href = filterHref({ status, level: l, q });
              const isActive = level === l;
              return (
                <Link
                  key={l}
                  href={href}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-secondary-foreground hover:bg-muted'
                  }`}
                >
                  {LEVEL_LABEL[l]}
                </Link>
              );
            })}
          </nav>
        </div>
        <form className="flex flex-wrap gap-2" action="/admin/categories" method="get">
          {status !== 'all' && <input type="hidden" name="status" value={status} />}
          {level !== 'all' && <input type="hidden" name="level" value={level} />}
          <label htmlFor="admin-categories-q" className="sr-only">
            Search categories
          </label>
          <input
            id="admin-categories-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by name or slug…"
            className="block w-full max-w-xs rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
          />
          <button
            type="submit"
            className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted"
          >
            Search
          </button>
          {q && (
            <Link
              href={filterHref({ status, level, q: '' })}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-secondary-foreground"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {(!cats || cats.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            {hasFilters ? 'No categories match your filters' : 'No categories yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? 'Try a different search term or filter.'
              : 'Start with top-level categories like Electronics, Home Appliances, etc.'}
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
                      {c.parent_id ? parentById.get(c.parent_id) ?? '—' : '—'}
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
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/admin/categories/${c.id}/edit`}
                          className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold text-secondary-foreground hover:bg-muted"
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

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery={baseQuery}
        basePath="/admin/categories"
      />
    </div>
  );
}
