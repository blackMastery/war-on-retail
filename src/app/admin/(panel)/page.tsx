import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import type { OrderStatus } from '@/types/database';

export const metadata = { title: 'Admin · Dashboard' };

/**
 * Order-status colour tokens. Match `/admin/orders` and the order detail
 * page so the dashboard pills/cards "read" the same as the rest of admin.
 */
const STATUS_CARD_TONE: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 ring-amber-200 text-amber-900',
  approved: 'bg-blue-50 ring-blue-200 text-blue-900',
  fulfilled: 'bg-green-50 ring-green-200 text-green-900',
  cancelled: 'bg-gray-50 ring-gray-200 text-gray-700',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export default async function AdminDashboard() {
  const supabase = createAdminClient();

  // head:true count queries return a count without ever materialising the
  // rows — cheaper than fetching everything and tallying in JS, and easier
  // to read in the code.
  const [
    products,
    categories,
    brands,
    customers,
    pendingOrders,
    approvedOrders,
    fulfilledOrders,
    cancelledOrders,
    lowStock,
    recentChat,
  ] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase.from('categories').select('id', { count: 'exact', head: true }),
    supabase.from('brands').select('id', { count: 'exact', head: true }),
    supabase.from('customers').select('id', { count: 'exact', head: true }),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'approved'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'fulfilled'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'cancelled'),
    supabase
      .from('products')
      .select('id, name, stock_quantity, low_stock_threshold')
      .eq('track_inventory', true)
      .eq('is_active', true)
      .lte('stock_quantity', 5)
      .order('stock_quantity')
      .limit(8),
    supabase
      .from('chatbot_conversations')
      .select('id, user_message, bot_response, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const statusCards: { status: OrderStatus; value: number }[] = [
    { status: 'pending', value: pendingOrders.count ?? 0 },
    { status: 'approved', value: approvedOrders.count ?? 0 },
    { status: 'fulfilled', value: fulfilledOrders.count ?? 0 },
    { status: 'cancelled', value: cancelledOrders.count ?? 0 },
  ];
  const totalOrders = statusCards.reduce((sum, c) => sum + c.value, 0);

  const recordCards = [
    { label: 'Products', value: products.count ?? 0, href: '/admin/products' },
    { label: 'Categories', value: categories.count ?? 0, href: '/admin/categories' },
    { label: 'Brands', value: brands.count ?? 0, href: '/admin/brands' },
    { label: 'Customers', value: customers.count ?? 0, href: '/admin/customers' },
  ];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-gray-600">Overview of orders, catalogue, and recent activity.</p>
      </header>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-900">Orders by status</h2>
          <p className="text-xs text-gray-500 tabular-nums">
            {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} total
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statusCards.map((c) => (
            <Link
              key={c.status}
              href={`/admin/orders?status=${c.status}`}
              className={`rounded-lg p-5 ring-1 transition hover:shadow-md ${STATUS_CARD_TONE[c.status]}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide">
                {STATUS_LABEL[c.status]}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums">{c.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Catalogue &amp; customers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recordCards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200 hover:shadow-md"
            >
              <p className="text-xs uppercase tracking-wide text-gray-500">{c.label}</p>
              <p className="mt-1 text-3xl font-bold text-gray-900">{c.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-bold">Low stock</h2>
          <p className="text-xs text-gray-500">Active inventory ≤ 5 units.</p>
          <ul className="mt-3 divide-y divide-gray-100">
            {(lowStock.data ?? []).length === 0 && (
              <li className="py-3 text-sm text-gray-500">Nothing low. 🎉</li>
            )}
            {lowStock.data?.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/products/${p.id}/edit`} className="hover:underline">
                  {p.name}
                </Link>
                <span className="font-mono text-xs text-orange-600">{p.stock_quantity} left</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
          <h2 className="font-bold">Recent chatbot conversations</h2>
          <p className="text-xs text-gray-500">Last 5 messages received.</p>
          <ul className="mt-3 space-y-3">
            {(recentChat.data ?? []).length === 0 && (
              <li className="text-sm text-gray-500">No chats yet.</li>
            )}
            {recentChat.data?.map((c) => (
              <li key={c.id} className="rounded bg-gray-50 p-2 text-xs">
                <p className="font-medium text-gray-900">› {c.user_message}</p>
                <p className="mt-1 text-gray-600">{c.bot_response}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
