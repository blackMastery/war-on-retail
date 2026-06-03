import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import Pagination from '@/components/customer/Pagination';
import { paginate, parsePage } from '@/lib/pagination';
import { buildIlikeOrClause } from '@/lib/products/search';
import { formatPrice } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

export const metadata = { title: 'Admin · Orders' };
export const dynamic = 'force-dynamic';

const ORDER_PAGE_SIZE = 20;
const STATUS_FILTERS = ['all', 'pending', 'approved', 'fulfilled', 'cancelled'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function parseStatus(raw: string | undefined): StatusFilter {
  return STATUS_FILTERS.includes(raw as StatusFilter)
    ? (raw as StatusFilter)
    : 'pending';
}

const STATUS_TONE: Record<OrderStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-blue-100 text-blue-800',
  fulfilled: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-600',
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const requestedPage = parsePage(sp.page);
  const status = parseStatus(sp.status);
  const q = (sp.q ?? '').trim();
  const offset = (requestedPage - 1) * ORDER_PAGE_SIZE;

  const supabase = createAdminClient();

  // Build the query. `customer:` and `payment_method:` are PostgREST embedded
  // selects — the FK is detected automatically.
  let query = supabase
    .from('orders')
    .select(
      'id, order_number, status, fulfillment_type, subtotal, discount_code, discount_amount, placed_at, customer:customers(name, phone), payment_method:payment_methods(name)',
      { count: 'exact' },
    );

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  // If a search term was provided, first resolve any matching customer IDs
  // and OR the order_number with `customer_id in (…)`.
  if (q) {
    const ilikePattern = `%${q.replace(/[%_,]/g, '\\$&')}%`;
    const { data: matched } = await supabase
      .from('customers')
      .select('id')
      .or(buildIlikeOrClause(q, ['name', 'phone']));
    const ids = (matched ?? []).map((c) => c.id);

    if (ids.length > 0) {
      query = query.or(
        `order_number.ilike.${ilikePattern},customer_id.in.(${ids.join(',')})`,
      );
    } else {
      query = query.ilike('order_number', ilikePattern);
    }
  }

  const { data: orders, count } = await query
    .order('placed_at', { ascending: false })
    .range(offset, offset + ORDER_PAGE_SIZE - 1);

  const pag = paginate({
    requestedPage,
    count,
    rows: orders ?? [],
    pageSize: ORDER_PAGE_SIZE,
  });

  // Preserve filter state across pagination links.
  const baseQueryParts: string[] = [];
  if (status !== 'pending') baseQueryParts.push(`status=${encodeURIComponent(status)}`);
  if (q) baseQueryParts.push(`q=${encodeURIComponent(q)}`);
  const baseQuery = baseQueryParts.join('&');

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-gray-600 tabular-nums">
            {pag.count === 0
              ? 'No orders match these filters.'
              : pag.count <= ORDER_PAGE_SIZE
                ? `${pag.count} ${pag.count === 1 ? 'order' : 'orders'}`
                : `Showing ${pag.firstIdx}–${pag.lastIdx} of ${pag.count}`}
          </p>
        </div>
      </header>

      {/* Status tabs + search */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {STATUS_FILTERS.map((s) => {
            const params = new URLSearchParams();
            if (s !== 'pending') params.set('status', s);
            if (q) params.set('q', q);
            const href = `/admin/orders${params.toString() ? `?${params}` : ''}`;
            const isActive = status === s;
            return (
              <Link
                key={s}
                href={href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium capitalize ${
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {s}
              </Link>
            );
          })}
        </nav>
        <form className="ml-auto" action="/admin/orders" method="get">
          {status !== 'pending' && <input type="hidden" name="status" value={status} />}
          <label htmlFor="admin-orders-q" className="sr-only">
            Search orders
          </label>
          <input
            id="admin-orders-q"
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search by order #, name, or phone…"
            className="w-72 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </form>
      </div>

      {(!orders || orders.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No orders to show</p>
          <p className="mt-1 text-sm text-gray-600">
            When customers complete checkout, their orders appear here.
          </p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Fulfilment</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.map((o) => {
                // PostgREST embedded selects come back as an object (or null).
                // Cast through `unknown` because the typed Database has empty
                // `Relationships`, so the inferred shape is a SelectQueryError.
                const customer = o.customer as unknown as
                  | { name: string; phone: string }
                  | null;
                const paymentMethod = o.payment_method as unknown as
                  | { name: string }
                  | null;
                const discountAmount = Number(o.discount_amount ?? 0);
                const orderTotal = Math.max(0, Number(o.subtotal) - discountAmount);
                return (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-900">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(o.placed_at).toLocaleString('en-GY', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {customer?.name ?? '—'}
                      </div>
                      <div className="text-xs text-gray-500">{customer?.phone ?? ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                          o.fulfillment_type === 'delivery'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {o.fulfillment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{paymentMethod?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums">
                      {formatPrice(orderTotal)}
                      {discountAmount > 0 && (
                        <span className="block text-xs font-normal text-green-700">
                          −{formatPrice(discountAmount)}
                          {o.discount_code ? ` (${o.discount_code})` : ''}
                        </span>
                      )}
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
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery={baseQuery}
        basePath="/admin/orders"
      />
    </div>
  );
}
