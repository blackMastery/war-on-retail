import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('brands')
    .select('name, description')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: 'Brand not found' };
  return { title: data.name, description: data.description ?? undefined };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!brand) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('brand_id', brand.id)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(48);

  return (
    <main className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">{brand.name}</h1>
        {brand.description && (
          <p className="mt-2 max-w-2xl text-gray-600">{brand.description}</p>
        )}
      </header>
      <ProductGrid products={products ?? []} />
    </main>
  );
}
