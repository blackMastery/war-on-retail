'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Result of the returning-customer lookup. `found:false` covers both "no such
 * customer" and any lookup error — the UI treats them identically (quiet hint).
 */
export type CustomerLookupResult =
  | { found: true; name: string; delivery: { city: string; address: string } | null }
  | { found: false };

/**
 * Looks up a returning customer's saved name + most recent delivery address by
 * phone, powering the checkout's "Find my info" button. Calls the
 * `lookup_customer_by_phone` SECURITY DEFINER RPC (granted to anon), which
 * returns only those whitelisted fields — the `customers` table itself stays
 * RLS-locked to anon.
 */
export async function lookupCustomerAction(phone: string): Promise<CustomerLookupResult> {
  const trimmed = (phone ?? '').trim();
  if (!trimmed) return { found: false };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('lookup_customer_by_phone', { p_phone: trimmed });
  if (error) {
    console.error('[checkout] customer lookup failed', error);
    return { found: false };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.name) return { found: false };

  const delivery = row.last_delivery_address
    ? { city: row.last_delivery_city ?? '', address: row.last_delivery_address }
    : null;
  return { found: true, name: row.name, delivery };
}

/**
 * Combined Zod schema for the wizard payload. Mirrors the per-step checks
 * client-side but is the *authoritative* shape — the client validation is for
 * UX; this is what protects the database.
 */
const PlaceOrderInput = z.object({
  customer: z.object({
    name: z.string().trim().min(2, 'Name is required'),
    phone: z
      .string()
      .trim()
      .regex(/^[0-9+()\-\s]{7,20}$/, 'Phone must be 7–20 characters of digits / + ( ) - spaces'),
  }),
  fulfillment: z.discriminatedUnion('type', [
    z.object({
      type: z.literal('delivery'),
      city: z.string().trim().min(2),
      address: z.string().trim().min(6),
    }),
    z.object({ type: z.literal('pickup') }),
  ]),
  paymentMethodId: z.string().uuid('Pick a valid payment method'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, 'Cart is empty'),
  // Optional discount code. The RPC re-validates it authoritatively against
  // DB-locked prices — this is just the code the customer applied in the cart.
  discountCode: z.string().trim().max(64).optional(),
});

export type PlaceOrderInputT = z.infer<typeof PlaceOrderInput>;
export type PlaceOrderResult =
  | { orderNumber: string; error?: undefined }
  | { error: string; orderNumber?: undefined };

/**
 * The single mutation the customer can perform — calls the `place_order`
 * Postgres RPC, which encapsulates the stock-check + decrement + order +
 * item rows atomically.
 *
 * Surfaces Postgres-side errors as user-readable strings:
 *   - OUT_OF_STOCK → "Some items in your cart are out of stock. Please review."
 *   - PM_INACTIVE  → "The selected payment method is no longer available."
 *   - PRODUCT_MISSING → "An item in your cart is no longer available."
 *   - anything else → the raw error message (admins will see it in logs too).
 */
export async function placeOrderAction(input: PlaceOrderInputT): Promise<PlaceOrderResult> {
  const parsed = PlaceOrderInput.safeParse(input);
  if (!parsed.success) {
    return {
      error:
        parsed.error.errors[0]?.message ?? 'Please review your details and try again.',
    };
  }

  const { customer, fulfillment, paymentMethodId, items, discountCode } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('place_order', {
    p_customer: customer,
    p_fulfillment: fulfillment,
    p_payment_method_id: paymentMethodId,
    p_items: items,
    p_discount_code: discountCode && discountCode.length > 0 ? discountCode : null,
  });

  if (error) {
    const msg = error.message || '';
    if (msg.startsWith('OUT_OF_STOCK')) {
      return {
        error:
          "One or more items are out of stock. Please update your cart and try again.",
      };
    }
    if (msg.startsWith('PM_INACTIVE')) {
      return { error: 'The selected payment method is no longer available.' };
    }
    if (msg.startsWith('PRODUCT_MISSING')) {
      return {
        error:
          "An item in your cart is no longer available. Please remove it and try again.",
      };
    }
    // Discount-specific failures (the RPC re-validates the code). All map to a
    // single ask: remove/replace the code and retry — the cart's discount UI is
    // the place to fix it.
    if (msg.startsWith('DISCOUNT_')) {
      if (msg.startsWith('DISCOUNT_MIN_PURCHASE')) {
        return { error: 'Your order no longer meets the minimum for that discount code. Please review your cart.' };
      }
      if (msg.startsWith('DISCOUNT_USAGE_LIMIT')) {
        return { error: 'That discount code has reached its usage limit.' };
      }
      if (msg.startsWith('DISCOUNT_PER_CUSTOMER_LIMIT')) {
        return { error: 'You’ve already used that discount code.' };
      }
      if (msg.startsWith('DISCOUNT_EXPIRED') || msg.startsWith('DISCOUNT_NOT_STARTED')) {
        return { error: 'That discount code isn’t valid right now. Please remove it and try again.' };
      }
      return {
        error: 'That discount code is no longer valid — please remove it and try again.',
      };
    }
    return { error: msg || 'Could not place the order. Please try again.' };
  }

  // The RPC returns `setof record` — Supabase represents this as an array of rows.
  const first = Array.isArray(data) ? data[0] : data;
  const orderNumber = (first as { order_number?: string } | null)?.order_number;
  if (!orderNumber) {
    return { error: 'Order was created but no order number returned. Please contact us.' };
  }
  return { orderNumber };
}
