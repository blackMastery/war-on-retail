import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import ProductForm from '@/components/admin/ProductForm';

export const metadata = { title: 'Admin · Edit product' };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: product }, { data: categories }, { data: brands }] = await Promise.all([
    supabase.from('products').select('*').eq('id', id).maybeSingle(),
    supabase.from('categories').select('*').order('display_order'),
    supabase.from('brands').select('*').order('display_order'),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {product.name}</h1>
      <ProductForm product={product} categories={categories ?? []} brands={brands ?? []} />
    </div>
  );
}
