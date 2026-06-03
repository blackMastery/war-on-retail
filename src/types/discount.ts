/**
 * Domain types for the discount-code feature.
 *
 * The database row shapes live in `@/types/database`
 * (`DiscountCodeRow`, `DiscountCodeUsageRow`). This file holds the *behavioural*
 * types used by the validation/calculation helpers, the customer cart, and the
 * `/api/discounts/validate` route.
 */

import type { DiscountCodeRow, DiscountType } from '@/types/database';

export type { DiscountType };

/**
 * A minimal cart line the discount logic needs: the product id (for
 * applicability filters) and the per-unit price + quantity (for BOGO's
 * cheapest-item rule and subtotal sanity checks).
 */
export type DiscountLineItem = {
  productId: string;
  /** Per-unit price in GYD. */
  price: number;
  quantity: number;
};

/**
 * Result of {@link validateDiscountCode}. A discriminated union so callers
 * `if (result.valid)` and then read either `code` or `error`.
 */
export type DiscountValidationResult =
  | { valid: true; code: DiscountCodeRow }
  | { valid: false; error: string };

/**
 * A successfully applied discount, ready to render in the cart/checkout and to
 * persist. All monetary fields are GYD.
 *
 * NOTE: this is the cart-time *estimate*. The authoritative amount is computed
 * again inside the `place_order` RPC against DB-locked prices; the two agree
 * because the TS and SQL logic mirror each other.
 */
export type AppliedDiscount = {
  /** The code as stored (e.g. "SUMMER20"). */
  code: string;
  description: string | null;
  type: DiscountType;
  /** GYD taken off the subtotal. */
  amountDiscounted: number;
  /** Subtotal the discount was computed against. */
  originalTotal: number;
  /** originalTotal - amountDiscounted, never below 0. */
  finalTotal: number;
};

/** Subtotal / discount / total triple used to render a cart summary. */
export type CartCalculation = {
  subtotal: number;
  discount: number;
  total: number;
};
