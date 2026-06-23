import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatPrice } from '@/lib/utils';
import { ORDER_STATUS_BADGE } from '@/lib/admin/tokens';
import { fetchReviewStatusByProductIds } from '@/lib/products/reviews';
import type { ReviewStatus } from '@/types/database';

export const metadata = { title: 'My orders' };

const REVIEW_STATUS_BADGE: Record<ReviewStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

export default async function OrdersPage() {
  // RLS ("customer reads own orders" / "...order items") scopes these to the
  // signed-in customer's linked rows. We fetch items separately and group in
  // JS — the hand-maintained types don't declare FK relationships for embeds.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: orders } = await supabase
    .from('orders')
    .select(
      'id, order_number, status, fulfillment_type, subtotal, discount_amount, discount_code, placed_at',
    )
    .order('placed_at', { ascending: false });

  const rows = orders ?? [];

  type OrderLine = {
    id: string;
    product_id: string | null;
    product_slug: string;
    product_name: string;
    product_sku: string | null;
    quantity: number;
    unit_price: number;
    line_total: number;
  };

  const itemsByOrder = new Map<string, OrderLine[]>();
  const productIds: string[] = [];

  if (rows.length > 0) {
    const { data: items } = await supabase
      .from('order_items')
      .select(
        'id, order_id, product_id, product_slug, product_name, product_sku, quantity, unit_price, line_total',
      )
      .in(
        'order_id',
        rows.map((o) => o.id),
      );
    for (const it of items ?? []) {
      const list = itemsByOrder.get(it.order_id) ?? [];
      list.push(it);
      itemsByOrder.set(it.order_id, list);
      if (it.product_id) productIds.push(it.product_id);
    }
  }

  const reviewStatusByProduct = user
    ? await fetchReviewStatusByProductIds(supabase, user.id, [...new Set(productIds)])
    : new Map<string, ReviewStatus>();

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="text-lg font-semibold text-foreground">No orders yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Orders you place while signed in — or that match your account email — will appear
          here.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">My orders</h2>
      {rows.map((o) => {
        const items = itemsByOrder.get(o.id) ?? [];
        const payable = o.subtotal - o.discount_amount;
        const isFulfilled = o.status === 'fulfilled';
        return (
          <article key={o.id} className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <p className="font-semibold">{o.order_number}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.placed_at).toLocaleString()} · {o.fulfillment_type}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ORDER_STATUS_BADGE[o.status]}`}
              >
                {o.status}
              </span>
            </div>

            <ul className="mt-3 divide-y divide-border text-sm">
              {items.map((it) => {
                const reviewStatus = it.product_id
                  ? reviewStatusByProduct.get(it.product_id)
                  : undefined;
                return (
                  <li key={it.id} className="flex items-start justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate">{it.product_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {it.quantity} × {formatPrice(it.unit_price)}
                        {it.product_sku ? ` · ${it.product_sku}` : ''}
                      </span>
                      {isFulfilled && it.product_id && (
                        <span className="mt-1 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/products/${it.product_slug}#reviews`}
                            className="text-xs font-medium text-link hover:underline"
                          >
                            {reviewStatus ? 'Edit review' : 'Write review'}
                          </Link>
                          {reviewStatus && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${REVIEW_STATUS_BADGE[reviewStatus]}`}
                            >
                              Review {reviewStatus}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 tabular-nums">{formatPrice(it.line_total)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(o.subtotal)}</span>
              </div>
              {o.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount{o.discount_code ? ` (${o.discount_code})` : ''}</span>
                  <span className="tabular-nums">−{formatPrice(o.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular-nums">{formatPrice(payable)}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
