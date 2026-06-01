'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

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

  const { customer, fulfillment, paymentMethodId, items } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('place_order', {
    p_customer: customer,
    p_fulfillment: fulfillment,
    p_payment_method_id: paymentMethodId,
    p_items: items,
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
