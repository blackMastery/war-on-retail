import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import BrandForm from '@/components/admin/BrandForm';

export const metadata = { title: 'Admin · Edit brand' };

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: brand } = await supabase.from('brands').select('*').eq('id', id).maybeSingle();
  if (!brand) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {brand.name}</h1>
      <BrandForm brand={brand} />
    </div>
  );
}
