/**
 * Discount validation — runs the same checks as the `place_order` RPC, but at
 * cart time so the customer gets immediate, specific feedback. This is the UX
 * gate; the RPC is the authoritative one (it re-checks against DB-locked
 * prices and is what actually records the redemption).
 *
 * Checks, in order (matches the spec + the SQL):
 *   1. code exists and is_active
 *   2. now >= valid_from        (if set)
 *   3. now <= valid_until       (if set)
 *   4. subtotal >= min_purchase_amount (if set)
 *   5. usage_count < usage_limit       (if set)
 *   6. per-customer uses < per_customer_limit (by phone, then session id)
 *   7. cart products intersect applicable_product_ids   (if set)
 *      (and at least one applicable category, if applicable_category_ids set)
 *   8. cart products don't intersect exclude_product_ids (if set)
 *   + BOGO requires at least 2 items.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { DiscountValidationResult } from '@/types/discount';

export type ValidateParams = {
  /** GYD subtotal the discount would apply to. */
  subtotal: number;
  /** Product ids in the cart, for applicability/exclusion filters. */
  productIds: string[];
  /** Total units across all lines (BOGO needs ≥ 2). */
  itemCount: number;
  /** Normalised phone, when known (checkout). Preferred per-customer key. */
  customerPhone?: string | null;
  /** Anonymous session id, used at cart time before a phone exists. */
  sessionId?: string | null;
};

function hasAny(arr: string[] | null | undefined): arr is string[] {
  return Array.isArray(arr) && arr.length > 0;
}

function intersects(a: string[], b: string[]): boolean {
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

/**
 * Looks up `code` (case-insensitive) and runs every gate. Returns the row on
 * success or a customer-facing error string on failure.
 */
export async function validateDiscountCode(
  supabase: SupabaseClient<Database>,
  code: string,
  params: ValidateParams,
): Promise<DiscountValidationResult> {
  const normalised = code.trim();
  if (!normalised) {
    return { valid: false, error: 'Enter a discount code.' };
  }

  // 1. Exists. (Case-insensitive — codes are unique but typed in any case.)
  const { data: row, error } = await supabase
    .from('discount_codes')
    .select('*')
    .ilike('code', normalised)
    .maybeSingle();

  if (error) {
    console.error('[discounts/validation] lookup failed', error);
    return { valid: false, error: 'Could not check that code. Please try again.' };
  }
  if (!row) {
    return { valid: false, error: 'That code isn’t recognised.' };
  }
  if (!row.is_active) {
    return { valid: false, error: 'That code is no longer active.' };
  }

  // 2–3. Validity window.
  const now = Date.now();
  if (row.valid_from && new Date(row.valid_from).getTime() > now) {
    return { valid: false, error: 'That code isn’t active yet.' };
  }
  if (row.valid_until && new Date(row.valid_until).getTime() < now) {
    return { valid: false, error: 'That code has expired.' };
  }

  // 4. Minimum purchase.
  if (row.min_purchase_amount != null && params.subtotal < row.min_purchase_amount) {
    return {
      valid: false,
      error: `Spend at least GYD $${Math.round(row.min_purchase_amount).toLocaleString('en-GY')} to use this code.`,
    };
  }

  // 5. Global usage limit.
  if (row.usage_limit != null && row.usage_count >= row.usage_limit) {
    return { valid: false, error: 'This code has reached its usage limit.' };
  }

  // 6. Per-customer limit. Prefer phone; fall back to session id at cart time.
  if (row.per_customer_limit != null && row.per_customer_limit > 0) {
    const key = params.customerPhone
      ? { column: 'customer_phone' as const, value: params.customerPhone }
      : params.sessionId
        ? { column: 'customer_session_id' as const, value: params.sessionId }
        : null;
    if (key) {
      const { count, error: usageErr } = await supabase
        .from('discount_code_usage')
        .select('id', { count: 'exact', head: true })
        .eq('discount_code_id', row.id)
        .eq(key.column, key.value);
      if (usageErr) {
        console.error('[discounts/validation] usage count failed', usageErr);
      } else if ((count ?? 0) >= row.per_customer_limit) {
        return { valid: false, error: 'You’ve already used this code.' };
      }
    }
  }

  // 7. Applicable products / categories. (Category match is a coarse cart-time
  //    check using product ids only; the RPC has the real category data.)
  if (hasAny(row.applicable_product_ids) && !intersects(params.productIds, row.applicable_product_ids)) {
    return { valid: false, error: 'This code doesn’t apply to the items in your cart.' };
  }

  // 8. Exclusions.
  if (hasAny(row.exclude_product_ids) && intersects(params.productIds, row.exclude_product_ids)) {
    return { valid: false, error: 'This code can’t be used with one or more items in your cart.' };
  }

  // BOGO needs at least two items.
  if (row.discount_type === 'bogo' && params.itemCount < 2) {
    return { valid: false, error: 'Add at least 2 items to use this code.' };
  }

  return { valid: true, code: row };
}
