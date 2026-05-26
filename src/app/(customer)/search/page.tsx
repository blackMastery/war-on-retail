import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';
import Pagination from '@/components/customer/Pagination';
import ResultCount from '@/components/customer/ResultCount';
import { PAGE_SIZE, paginate, parsePage } from '@/lib/pagination';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Search' };

/**
 * Escapes the PostgREST `ilike` wildcards (`%`, `_`) and the separator that
 * the `.or(...)` filter uses (`,`). Anything else flows through verbatim so
 * the user can type spaces, hyphens, etc. without confusing the matcher.
 */
function buildPattern(raw: string): string {
  const safe = raw.replace(/[%_,]/g, '\\$&');
  return `%${safe}%`;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = '', page } = await searchParams;
  const requestedPage = parsePage(page);
  const supabase = await createClient();

  // Build the query. When q is empty we skip the .or() filter entirely so the
  // page can still render a clean prompt instead of a 0-results state.
  const offset = (requestedPage - 1) * PAGE_SIZE;
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true);

  if (q.trim()) {
    const pattern = buildPattern(q.trim());
    // `or(...)` matches any of name / short_description / description / SKU.
    // Note: we used to call the search_products RPC here for tsvector ranking,
    // but RPCs can't return a count for pagination. Trading rank for totals.
    query = query.or(
      [
        `name.ilike.${pattern}`,
        `short_description.ilike.${pattern}`,
        `description.ilike.${pattern}`,
        `sku.ilike.${pattern}`,
      ].join(','),
    );
  }

  const { data: products, count, error } = await query
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const pag = paginate({ requestedPage, count, rows: products ?? [] });

  return (
    <div className="container py-10">
      <h1 className="text-2xl font-bold">Search results</h1>
      <p className="mt-1 text-sm text-gray-600 tabular-nums">
        {q ? (
          <>
            Showing matches for <span className="font-medium text-gray-900">“{q}”</span>
            {pag.count > 0 && pag.count <= PAGE_SIZE && ` — ${pag.count} found`}
            {pag.count > PAGE_SIZE && ` — ${pag.firstIdx}–${pag.lastIdx} of ${pag.count}`}
          </>
        ) : (
          'Enter a term in the search bar above to find products.'
        )}
      </p>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          Search is temporarily unavailable. Please try again in a moment.
        </p>
      )}

      <div className="mt-6">
        <ProductGrid products={products ?? []} />
      </div>

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery={q ? `q=${encodeURIComponent(q)}` : ''}
        basePath="/search"
      />
    </div>
  );
}
