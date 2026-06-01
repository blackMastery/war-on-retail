import { notFound } from 'next/navigation';
import Link from 'next/link';
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
    .from('categories')
    .select('name, description, meta_title, meta_description, meta_keywords')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: 'Category not found' };
  // Admin overrides win; description ladder falls back to the customer-facing
  // `description` field that already existed.
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

export default async function CategoryPage({
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

  const { data: category } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!category) notFound();

  const { data: subcats } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .eq('parent_id', category.id)
    .order('display_order');

  // Collect ids: the category itself + all descendant subcategories.
  const ids = [category.id, ...(subcats ?? []).map((c) => c.id)];

  const offset = (requestedPage - 1) * PAGE_SIZE;
  const { data: products, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .in('category_id', ids)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const pag = paginate({ requestedPage, count, rows: products ?? [] });

  return (
    <div className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-gray-600">{category.description}</p>
        )}
        <ResultCount state={pag} emptyMessage="No products in this category yet." />
      </header>

      {subcats && subcats.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          {subcats.map((s) => (
            <Link
              key={s.id}
              href={`/categories/${s.slug}`}
              className="rounded-full bg-white px-3 py-1 text-sm font-medium text-gray-700 ring-1 ring-gray-200 hover:bg-primary-50 hover:text-primary-700"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <ProductGrid products={products ?? []} />

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery=""
        basePath={`/categories/${category.slug}`}
      />
    </div>
  );
}
