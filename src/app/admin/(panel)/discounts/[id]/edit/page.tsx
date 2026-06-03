import { notFound } from 'next/navigation';
import DiscountCodeForm from '@/components/admin/DiscountCodeForm';
import AuditInfo from '@/components/admin/AuditInfo';
import { createAdminClient } from '@/lib/supabase/admin';

export const metadata = { title: 'Admin · Edit discount code' };

export default async function EditDiscountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: discount } = await supabase
    .from('discount_codes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!discount) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">
        Edit <span className="font-mono">{discount.code}</span>
      </h1>
      <DiscountCodeForm discount={discount} />
      <AuditInfo
        createdBy={discount.created_by}
        modifiedBy={discount.modified_by}
        createdAt={discount.created_at}
        updatedAt={discount.updated_at}
      />
    </div>
  );
}
