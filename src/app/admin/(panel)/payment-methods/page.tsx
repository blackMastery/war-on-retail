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
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment methods</h1>
          <p className="mt-1 text-sm text-gray-600">
            Shown to customers in Step 3 of <Link href="/checkout" className="text-primary-600 hover:underline">checkout</Link>.
          </p>
        </div>
        <Link
          href="/admin/payment-methods/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + New payment method
        </Link>
      </header>

      {(!methods || methods.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No payment methods yet</p>
          <p className="mt-1 text-sm text-gray-600">
            Add at least one so customers can complete checkout.
          </p>
        </div>
      )}

      {methods && methods.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3 text-right">Orders</th>
                <th className="px-4 py-3 text-right">Order</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {methods.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="max-w-md px-4 py-3 text-xs text-gray-600">
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
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {m.is_active ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3 text-xs">
                      <Link
                        href={`/admin/payment-methods/${m.id}/edit`}
                        className="font-medium text-primary-600 hover:underline"
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
