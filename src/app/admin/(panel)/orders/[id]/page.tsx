import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import { formatPrice } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import type { OrderStatus } from '@/types/database';
import OrderStatusActions from './OrderStatusActions';
import OrderNotesForm from './OrderNotesForm';

export const metadata = { title: 'Admin · Order' };
export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, fulfillment_type, delivery_city, delivery_address, subtotal, admin_notes, placed_at, customer_id, payment_method_id, customer:customers(id, name, phone), payment_method:payment_methods(name, description)',
    )
    .eq('id', id)
    .maybeSingle();

  if (!order) notFound();

  const { data: items } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', id)
    .order('created_at');

  // Cast through `unknown` — the typed Database has empty `Relationships`,
  // so PostgREST embed inference would otherwise complain. The shape comes
  // straight from the select string above.
  const customer = order.customer as unknown as
    | { id: string; name: string; phone: string }
    | null;
  const paymentMethod = order.payment_method as unknown as
    | { name: string; description: string | null }
    | null;
  const status = order.status as OrderStatus;
  const hasPreOrder = (items ?? []).some((it) => it.is_pre_order);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← All orders
          </Link>
          <h1 className="mt-1 font-mono text-2xl font-bold">{order.order_number}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Placed{' '}
            {new Date(order.placed_at).toLocaleString('en-GY', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium capitalize ${
              STATUS_TONE[status]
            }`}
          >
            {status}
          </span>
          {hasPreOrder && (
            <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
              Pre-order
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer + fulfilment */}
        <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 lg:col-span-1">
          <h2 className="font-semibold">Customer</h2>
          {customer ? (
            <div className="mt-3 space-y-1 text-sm">
              <div className="font-medium text-gray-900">{customer.name}</div>
              <div>
                <a
                  href={`tel:${customer.phone}`}
                  className="text-primary-600 hover:underline"
                >
                  {customer.phone}
                </a>
              </div>
              <Link
                href={`/admin/customers/${customer.id}`}
                className="mt-2 inline-block text-xs font-medium text-primary-600 hover:underline"
              >
                View all orders from this customer →
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">Customer record was removed.</p>
          )}

          <h2 className="mt-6 font-semibold">Fulfilment</h2>
          <p className="mt-2 text-sm">
            <span className="font-medium capitalize">{order.fulfillment_type}</span>
          </p>
          {order.fulfillment_type === 'delivery' && (
            <dl className="mt-2 space-y-1 text-sm text-gray-700">
              {order.delivery_city && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">City</dt>
                  <dd>{order.delivery_city}</dd>
                </div>
              )}
              {order.delivery_address && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-gray-500">Address</dt>
                  <dd className="whitespace-pre-line">{order.delivery_address}</dd>
                </div>
              )}
            </dl>
          )}
          {order.fulfillment_type === 'pickup' && (
            <p className="mt-2 text-xs text-gray-500">
              Customer will collect from {siteConfig.address}.
            </p>
          )}

          <h2 className="mt-6 font-semibold">Payment</h2>
          <p className="mt-2 text-sm font-medium text-gray-900">
            {paymentMethod?.name ?? 'Unknown'}
          </p>
          {paymentMethod?.description && (
            <p className="mt-1 text-xs text-gray-600">{paymentMethod.description}</p>
          )}
        </section>

        {/* Items + total + actions */}
        <section className="space-y-6 lg:col-span-2">
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3 text-right">Unit</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Line total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(items ?? []).map((it) => (
                  <tr key={it.id}>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{it.product_name}</span>
                        {it.is_pre_order && (
                          <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-800">
                            Pre-order
                          </span>
                        )}
                      </div>
                      {it.product_id ? (
                        <Link
                          href={`/products/${it.product_slug}`}
                          className="text-xs text-primary-600 hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          View product →
                        </Link>
                      ) : (
                        <span className="text-xs italic text-gray-500">
                          Product was deleted; snapshot kept.
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {it.product_sku ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {formatPrice(Number(it.unit_price))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{it.quantity}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatPrice(Number(it.line_total))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50">
                  <td colSpan={4} className="px-4 py-3 text-right font-semibold">
                    Subtotal
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold tabular-nums">
                    {formatPrice(Number(order.subtotal))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Actions */}
          <OrderStatusActions orderId={order.id} status={status} />

          {/* Notes */}
          <OrderNotesForm orderId={order.id} initial={order.admin_notes ?? ''} />
        </section>
      </div>
    </div>
  );
}
