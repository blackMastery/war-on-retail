import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import PromotionForm from '@/components/admin/PromotionForm';
import AuditInfo from '@/components/admin/AuditInfo';

export const metadata = { title: 'Admin · Edit promotion' };

export default async function EditPromotionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: promotion } = await supabase
    .from('promotions')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!promotion) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {promotion.title}</h1>
      <PromotionForm promotion={promotion} />
      <AuditInfo
        createdBy={promotion.created_by}
        modifiedBy={promotion.modified_by}
        createdAt={promotion.created_at}
        updatedAt={promotion.updated_at}
      />
    </div>
  );
}
