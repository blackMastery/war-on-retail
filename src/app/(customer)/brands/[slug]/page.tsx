import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';
import Pagination from '@/components/customer/Pagination';
import ResultCount from '@/components/customer/ResultCount';
import { PAGE_SIZE, paginate, parsePage } from '@/lib/pagination';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('brands')
    .select('name, description, meta_title, meta_description, meta_keywords')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: 'Brand not found' };
  const keywords = data.meta_keywords
    ? data.meta_keywords.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;
  return {
    title: data.meta_title?.trim() || data.name,
    description:
      data.meta_description?.trim() || data.description?.trim() || undefined,
    keywords,
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const requestedPage = parsePage(page);
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!brand) notFound();

  const offset = (requestedPage - 1) * PAGE_SIZE;
  const { data: products, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .eq('brand_id', brand.id)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const pag = paginate({ requestedPage, count, rows: products ?? [] });

  return (
    <div className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold" translate="no">
          {brand.name}
        </h1>
        {brand.description && (
          <p className="mt-2 max-w-2xl text-muted-foreground">{brand.description}</p>
        )}
        <ResultCount state={pag} emptyMessage={`No ${brand.name} products yet.`} />
      </header>

      <ProductGrid
        products={products ?? []}
        gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
      />

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery=""
        basePath={`/brands/${brand.slug}`}
      />
    </div>
  );
}
