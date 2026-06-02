/**
 * Single source of truth for "can this product be bought right now, and how?"
 *
 * Replaces every inline `track_inventory && stock_quantity === 0` check that
 * used to live in ProductCard / detail page / cart. By centralising the rule
 * here, the customer-facing UI and the admin-facing previews can't drift.
 *
 *   untracked   → `track_inventory = false` — always purchasable, no count shown
 *   in-stock    → tracked, stock > 0 — normal Add-to-cart
 *   pre-order   → tracked, stock = 0, admin opted in — Pre-order CTA, no stock pill
 *   out-of-stock→ tracked, stock = 0, admin did NOT opt in — disabled
 *
 * Authoritative classification still happens server-side in the `place_order`
 * RPC; this helper just drives the UI so the customer's expectation matches
 * what they'll get.
 */
export type Availability = 'in-stock' | 'pre-order' | 'out-of-stock' | 'untracked';

export function productAvailability(p: {
  track_inventory: boolean;
  stock_quantity: number;
  is_pre_order_enabled: boolean;
}): Availability {
  if (!p.track_inventory) return 'untracked';
  if (p.stock_quantity > 0) return 'in-stock';
  if (p.is_pre_order_enabled) return 'pre-order';
  return 'out-of-stock';
}
