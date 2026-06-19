import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';
import ProductFilters from '@/components/customer/ProductFilters';
import ActiveFilterChips from '@/components/customer/ActiveFilterChips';
import Pagination from '@/components/customer/Pagination';
import {
  brandSlugsToIds,
  expandCategoryIds,
  filtersToQuery,
  readFilters,
  type ProductFilters as TProductFilters,
} from '@/lib/products/filters';
import type { Product } from '@/types/database';

import { pageMetadata } from '@/lib/page-seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return pageMetadata('products', { title: 'All Products' });
}

const PAGE_SIZE = 24;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filters = readFilters(sp);
  const requestedPage = parsePage(sp.page);

  const supabase = await createClient();

  // Fetch the taxonomy + price bounds alongside the products so the sidebar
  // can hydrate from real names and the slider scales to the actual catalogue.
  const [{ data: categories }, { data: brands }, priceBounds, page] = await Promise.all([
    supabase
      .from('categories')
      .select('id, slug, name, parent_id')
      .eq('is_active', true)
      .order('display_order'),
    supabase.from('brands').select('id, slug, name').eq('is_active', true).order('display_order'),
    fetchPriceBounds(),
    fetchProducts(filters, requestedPage),
  ]);

  const totalPages = Math.max(1, Math.ceil(page.totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const firstIdx = page.totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const lastIdx = (currentPage - 1) * PAGE_SIZE + page.rows.length;

  return (
    <div className="container py-6 sm:py-8">
      <header className="mb-6">
        <h1 className="text-pretty text-2xl font-bold sm:text-3xl">All Products</h1>
        <p className="mt-1 text-sm text-muted-foreground tabular-nums">
          {page.totalCount === 0
            ? 'No products match the current filters.'
            : page.totalCount <= PAGE_SIZE
              ? `${page.totalCount} ${page.totalCount === 1 ? 'product' : 'products'}`
              : `Showing ${firstIdx}–${lastIdx} of ${page.totalCount} products`}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <ProductFilters
          categories={categories ?? []}
          brands={brands ?? []}
          priceBounds={priceBounds}
        />

        <div className="min-w-0">
          <ActiveFilterChips
            filters={filters}
            categories={categories ?? []}
            brands={brands ?? []}
          />
          {page.rows.length === 0 ? <EmptyState /> : <ProductGrid products={page.rows} />}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseQuery={filtersToQuery(filters)}
          />
        </div>
      </div>
    </div>
  );

  // ---------- helpers ----------

  /**
   * Catalogue-wide price extremes. Used as the slider's hard bounds. We
   * deliberately do NOT respect the current filters here — narrowing the
   * slider to the visible subset would lock the user out of widening their
   * price range again.
   */
  async function fetchPriceBounds(): Promise<{ min: number; max: number }> {
    const sb = await createClient();
    const [{ data: minRow }, { data: maxRow }] = await Promise.all([
      sb
        .from('products')
        .select('price')
        .eq('is_active', true)
        .order('price', { ascending: true })
        .limit(1)
        .maybeSingle(),
      sb
        .from('products')
        .select('price')
        .eq('is_active', true)
        .order('price', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return {
      min: minRow?.price != null ? Math.floor(Number(minRow.price)) : 0,
      max: maxRow?.price != null ? Math.ceil(Number(maxRow.price)) : 1000,
    };
  }

  /**
   * Returns one page of products plus the total count of matching rows so the
   * pagination component can render the right number of page links.
   *
   * Caveat: when `onSale` is active, PostgREST can't compare the two columns
   * (`compare_at_price > price`), so we filter post-fetch. In that case the
   * returned `totalCount` is the count of rows where `compare_at_price IS NOT
   * NULL` — it can over-state by however many rows have a degenerate
   * compare_at_price ≤ price. For a clean catalogue this is zero. If it ever
   * matters, promote the predicate to a generated boolean column.
   */
  async function fetchProducts(
    f: TProductFilters,
    pageNum: number,
  ): Promise<{ rows: Product[]; totalCount: number }> {
    const sb = await createClient();
    const [{ data: cats }, { data: brs }] = await Promise.all([
      sb.from('categories').select('id, slug, parent_id'),
      sb.from('brands').select('id, slug'),
    ]);

    const categoryIds = expandCategoryIds(f.categorySlugs, cats ?? []);
    const brandIds = brandSlugsToIds(f.brandSlugs, brs ?? []);

    let q = sb.from('products').select('*', { count: 'exact' }).eq('is_active', true);
    if (categoryIds && categoryIds.length) q = q.in('category_id', categoryIds);
    if (brandIds && brandIds.length) q = q.in('brand_id', brandIds);
    if (f.minPrice != null) q = q.gte('price', f.minPrice);
    if (f.maxPrice != null) q = q.lte('price', f.maxPrice);
    if (f.inStock) q = q.gt('stock_quantity', 0);
    if (f.onSale) q = q.not('compare_at_price', 'is', null);

    switch (f.sort) {
      case 'price-asc':
        q = q.order('price', { ascending: true });
        break;
      case 'price-desc':
        q = q.order('price', { ascending: false });
        break;
      case 'newest':
        q = q.order('created_at', { ascending: false });
        break;
      case 'featured':
      default:
        q = q
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false });
    }

    const offset = (pageNum - 1) * PAGE_SIZE;
    const { data, count } = await q.range(offset, offset + PAGE_SIZE - 1);
    let rows = (data ?? []) as Product[];

    if (f.onSale) {
      rows = rows.filter((p) => p.compare_at_price != null && p.compare_at_price > p.price);
    }
    return { rows, totalCount: count ?? rows.length };
  }
}

function parsePage(raw: string | string[] | undefined): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
      <p className="text-lg font-semibold text-foreground">No matching products</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Try widening the price range or clearing a filter or two.
      </p>
    </div>
  );
}
