import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import PaymentMethodForm from '@/components/admin/PaymentMethodForm';

export const metadata = { title: 'Admin · Edit payment method' };

export default async function EditPaymentMethodPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: method } = await supabase
    .from('payment_methods')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!method) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {method.name}</h1>
      <PaymentMethodForm method={method} />
    </div>
  );
}
