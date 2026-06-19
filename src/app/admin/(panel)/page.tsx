import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { ADMIN_ALERT, ORDER_STATUS_CARD_ACCENT } from '@/lib/admin/tokens';
import type { OrderStatus } from '@/types/database';

export const metadata = { title: 'Admin · Dashboard' };

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  fulfilled: 'Fulfilled',
  cancelled: 'Cancelled',
};

export default async function AdminDashboard({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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
        <p className="text-sm text-muted-foreground">Overview of orders, catalogue, and recent activity.</p>
      </header>

      {error === 'forbidden' && (
        <div className={ADMIN_ALERT.warning}>
          You don’t have access to that section. Ask a store owner to grant it from{' '}
          <span className="font-medium">Team</span>.
        </div>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">Orders by status</h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} total
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statusCards.map((c) => (
            <Link
              key={c.status}
              href={`/admin/orders?status=${c.status}`}
              className={`rounded-lg border-t-4 bg-card p-5 shadow-sm ring-1 ring-border transition hover:shadow-md ${ORDER_STATUS_CARD_ACCENT[c.status]}`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {STATUS_LABEL[c.status]}
              </p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">{c.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">Catalogue &amp; customers</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recordCards.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border hover:shadow-md"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
              <p className="mt-1 text-3xl font-bold text-foreground">{c.value}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
          <h2 className="font-bold">Low stock</h2>
          <p className="text-xs text-muted-foreground">Active inventory ≤ 5 units.</p>
          <ul className="mt-3 divide-y divide-border">
            {(lowStock.data ?? []).length === 0 && (
              <li className="py-3 text-sm text-muted-foreground">Nothing low. 🎉</li>
            )}
            {lowStock.data?.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <Link href={`/admin/products/${p.id}/edit`} className="text-link-on-light hover:underline">
                  {p.name}
                </Link>
                <span className="font-mono text-xs text-amber-700">{p.stock_quantity} left</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
          <h2 className="font-bold">Recent chatbot conversations</h2>
          <p className="text-xs text-muted-foreground">Last 5 messages received.</p>
          <ul className="mt-3 space-y-3">
            {(recentChat.data ?? []).length === 0 && (
              <li className="text-sm text-muted-foreground">No chats yet.</li>
            )}
            {recentChat.data?.map((c) => (
              <li key={c.id} className="rounded bg-black/[0.04] p-2 text-xs">
                <p className="font-medium text-foreground">› {c.user_message}</p>
                <p className="mt-1 text-muted-foreground">{c.bot_response}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
