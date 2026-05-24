import { createAdminClient } from '@/lib/supabase/admin';
import ProductForm from '@/components/admin/ProductForm';

export const metadata = { title: 'Admin · New product' };

export default async function NewProductPage() {
  const supabase = createAdminClient();
  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('*').order('display_order'),
    supabase.from('brands').select('*').order('display_order'),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New product</h1>
      <ProductForm categories={categories ?? []} brands={brands ?? []} />
    </div>
  );
}
