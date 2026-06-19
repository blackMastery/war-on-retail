import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_BADGE } from '@/lib/admin/tokens';

export const metadata = { title: 'Account overview' };

export default async function AccountOverviewPage() {
  // RLS scopes these to the signed-in customer's linked rows.
  const supabase = await createClient();
  const [{ data: orders }, { count }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, order_number, status, subtotal, discount_amount, placed_at')
      .order('placed_at', { ascending: false })
      .limit(3),
    supabase.from('orders').select('id', { count: 'exact', head: true }),
  ]);

  const recent = orders ?? [];
  const orderCount = count ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/account/orders"
          className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
        >
          <p className="text-sm text-muted-foreground">Orders</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{orderCount}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {orderCount ? 'View your order history →' : 'No orders linked yet'}
          </p>
        </Link>
        <Link
          href="/account/wishlist"
          className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
        >
          <p className="text-sm text-muted-foreground">Wishlist</p>
          <p className="mt-1 text-sm font-medium text-foreground">Saved items</p>
          <p className="mt-1 text-sm text-muted-foreground">View your wishlist →</p>
        </Link>
      </div>

      <div className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          {recent.length > 0 && (
            <Link href="/account/orders" className="text-sm font-medium text-link-on-light hover:underline">
              View all
            </Link>
          )}
        </div>

        {recent.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Orders you place while signed in (or that match your email) will show up here.
            </p>
            <Link
              href="/products"
              className="mt-4 inline-block rounded-md bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold hover:opacity-90"
            >
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {recent.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{o.order_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(o.placed_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status]}`}
                  >
                    {o.status}
                  </span>
                  <span className="tabular-nums text-sm font-semibold">
                    {formatPrice(o.subtotal - o.discount_amount)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
