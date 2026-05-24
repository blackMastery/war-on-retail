import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('categories')
    .select('name, description')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: 'Category not found' };
  return { title: data.name, description: data.description ?? undefined };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .in('category_id', ids)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(48);

  return (
    <main className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{category.name}</h1>
        {category.description && (
          <p className="mt-2 max-w-2xl text-gray-600">{category.description}</p>
        )}
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
    </main>
  );
}
