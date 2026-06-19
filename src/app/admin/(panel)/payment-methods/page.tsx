import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import DeletePaymentMethodButton from './DeletePaymentMethodButton';

export const metadata = { title: 'Admin · Payment methods' };
export const dynamic = 'force-dynamic';

export default async function AdminPaymentMethodsPage() {
  const supabase = createAdminClient();
  const { data: methods } = await supabase
    .from('payment_methods')
    .select('*')
    .order('display_order')
    .order('name');

  // Used count per method — admins benefit from seeing "Cash is used by 12
  // orders" before considering a hard-delete.
  const { data: usageRows } = await supabase
    .from('orders')
    .select('payment_method_id');
  const usageByMethod = new Map<string, number>();
  for (const row of usageRows ?? []) {
    if (!row.payment_method_id) continue;
    usageByMethod.set(
      row.payment_method_id,
      (usageByMethod.get(row.payment_method_id) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Payment methods</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shown to customers in Step 3 of <Link href="/checkout" className="text-primary hover:underline">checkout</Link>.
          </p>
        </div>
        <Link
          href="/admin/payment-methods/new"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          + New payment method
        </Link>
      </header>

      {(!methods || methods.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">No payment methods yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add at least one so customers can complete checkout.
          </p>
        </div>
      )}

      {methods && methods.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {methods.map((m) => (
                <tr key={m.id} className="hover:bg-muted">
                  <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                  <td className="max-w-md px-4 py-3 text-xs text-muted-foreground">
                    {m.description ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {usageByMethod.get(m.id) ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">{m.display_order}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {m.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link
                        href={`/admin/payment-methods/${m.id}/edit`}
                        className="font-medium text-primary hover:underline"
                      >
                        Edit
                      </Link>
                      <DeletePaymentMethodButton
                        id={m.id}
                        name={m.name}
                        isActive={m.is_active}
                        usedByOrders={usageByMethod.get(m.id) ?? 0}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
