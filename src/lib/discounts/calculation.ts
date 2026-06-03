/**
 * Discount calculation — pure functions, no I/O.
 *
 * This mirrors the authoritative computation inside the `place_order` Postgres
 * RPC (see `supabase/migrations/20260101001700_orders_discounts.sql`). Keep the
 * two in lockstep: this drives the cart estimate, the RPC charges the customer.
 *
 * NOTE: this `calculateDiscount` is distinct from the one in `@/lib/utils`
 * (that one derives the compare-at "% off" badge from two prices). Different
 * module, different job — import from `@/lib/discounts/calculation`.
 */

import type { DiscountCodeRow } from '@/types/database';
import type { AppliedDiscount, DiscountLineItem } from '@/types/discount';

/** Round to 2 decimal places, matching Postgres `round(x, 2)`. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Computes the GYD amount a discount takes off a subtotal.
 *
 *   - percentage:   subtotal × value%
 *   - fixed_amount: a flat `value`
 *   - bogo:         cheapest line's unit price × value%  (requires ≥ 2 items)
 *
 * The raw amount is then capped at `max_discount_amount` (if set) and clamped
 * so it can never exceed the subtotal. Returns 0 for an empty cart.
 */
export function calculateDiscount(
  code: DiscountCodeRow,
  { subtotal, items }: { subtotal: number; items: DiscountLineItem[] },
): AppliedDiscount {
  let amount = 0;

  switch (code.discount_type) {
    case 'percentage': {
      amount = round2((subtotal * code.discount_value) / 100);
      break;
    }
    case 'fixed_amount': {
      amount = code.discount_value;
      break;
    }
    case 'bogo': {
      // Cheapest unit price across the cart; 50% BOGO on 2×$1000 → $500 off.
      const cheapest = items.reduce(
        (min, i) => (i.price < min ? i.price : min),
        items[0]?.price ?? 0,
      );
      amount = round2((cheapest * code.discount_value) / 100);
      break;
    }
  }

  // Cap, then clamp to the subtotal — never let the order go negative.
  if (code.max_discount_amount != null && amount > code.max_discount_amount) {
    amount = code.max_discount_amount;
  }
  if (amount > subtotal) amount = subtotal;
  if (amount < 0) amount = 0;
  amount = round2(amount);

  return {
    code: code.code,
    description: code.description,
    type: code.discount_type,
    amountDiscounted: amount,
    originalTotal: round2(subtotal),
    finalTotal: round2(subtotal - amount),
  };
}
