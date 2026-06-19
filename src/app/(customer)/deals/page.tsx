import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';
import Pagination from '@/components/customer/Pagination';
import ResultCount from '@/components/customer/ResultCount';
import { PAGE_SIZE, paginate, parsePage } from '@/lib/pagination';
import { pageMetadata } from '@/lib/page-seo';
import type { Product } from '@/types/database';

export const revalidate = 60;

export async function generateMetadata() {
  return pageMetadata('deals', { title: 'Deals' });
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const requestedPage = parsePage(page);
  const supabase = await createClient();

  // PostgREST can't express the column-vs-column predicate
  // `compare_at_price > price`, so we filter that in JS after fetching.
  // Count therefore counts rows with `compare_at_price IS NOT NULL`, which
  // can over-state by however many rows have a degenerate value
  // (compare_at_price ≤ price). For a clean catalogue this is exact.
  const offset = (requestedPage - 1) * PAGE_SIZE;
  const { data: rows, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .not('compare_at_price', 'is', null)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const onSale: Product[] = (rows ?? []).filter(
    (p) => p.compare_at_price != null && p.compare_at_price > p.price,
  );
  const pag = paginate({ requestedPage, count, rows: onSale });

  return (
    <div className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">
          <span aria-hidden="true">🔥 </span>Today’s Deals
        </h1>
        <p className="mt-1 text-muted-foreground">Live discounts across our catalogue.</p>
        <ResultCount state={pag} emptyMessage="No active deals right now — check back soon." />
      </header>

      <ProductGrid products={onSale} />

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery=""
        basePath="/deals"
      />
    </div>
  );
}
