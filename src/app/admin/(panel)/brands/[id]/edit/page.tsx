import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import BrandForm from '@/components/admin/BrandForm';
import AuditInfo from '@/components/admin/AuditInfo';

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
      <AuditInfo
        createdBy={brand.created_by}
        modifiedBy={brand.modified_by}
        createdAt={brand.created_at}
        updatedAt={brand.updated_at}
      />
    </div>
  );
}
