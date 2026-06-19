import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

export const metadata = { title: 'Admin · Customer' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-muted text-muted-foreground',
};

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!customer) notFound();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, fulfillment_type, subtotal, placed_at')
    .eq('customer_id', id)
    .order('placed_at', { ascending: false });

  const totalSpent = (orders ?? [])
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + Number(o.subtotal), 0);

  return (
    <div className="space-y-6">
      <header>
        <Link href="/admin/customers" className="text-sm font-medium text-primary hover:underline">
          ← All customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{customer.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <a href={`tel:${customer.phone}`} className="text-primary hover:underline">
            {customer.phone}
          </a>{' '}
          · First seen{' '}
          {new Date(customer.created_at).toLocaleDateString('en-GY', { dateStyle: 'medium' })}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Total orders" value={(orders ?? []).length} />
        <Stat
          label="Active orders"
          value={(orders ?? []).filter((o) =>
            ['pending', 'approved'].includes(o.status),
          ).length}
        />
        <Stat label="Total spent (non-cancelled)" value={formatPrice(totalSpent)} />
      </div>

      {(!orders || orders.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">No orders yet</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Fulfilment</th>
                <th className="px-4 py-3 text-right">Subtotal</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-muted">
                  <td className="px-4 py-3 font-mono text-xs font-medium text-foreground">
                    {o.order_number}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(o.placed_at).toLocaleString('en-GY', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 capitalize">{o.fulfillment_type}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {formatPrice(Number(o.subtotal))}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        STATUS_TONE[o.status as OrderStatus]
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      View →
                    </Link>
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
    </div>
  );
}
