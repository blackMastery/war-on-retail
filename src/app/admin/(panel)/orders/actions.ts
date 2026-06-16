'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { sendOrderEmail } from '@/lib/email/send';
import type { OrderStatus } from '@/types/database';

/** System template slug to fire when an order reaches each status. */
const STATUS_EMAIL_SLUG: Partial<Record<OrderStatus, string>> = {
  approved: 'order_approved',
  fulfilled: 'order_fulfilled',
  cancelled: 'order_cancelled',
};

/**
 * Best-effort status email. `sendOrderEmail` already no-ops when the customer
 * has no email or the template is inactive, and never throws — but we still
 * guard here so an email hiccup can never fail the status transition.
 */
async function notifyStatus(orderId: string, status: OrderStatus, adminId: string) {
  const slug = STATUS_EMAIL_SLUG[status];
  if (!slug) return;
  try {
    await sendOrderEmail({ orderId, slug, sentBy: adminId });
  } catch (err) {
    console.error('[orders] status email failed', err);
  }
}

/**
 * Status transition map. Each transition is one-way and gated; anything not
 * listed here is refused.
 *
 * Not exported from this file — `'use server'` modules can only export async
 * functions. The UI (`OrderStatusActions.tsx`) duplicates the relevant
 * "which buttons to show" logic inline via a `switch (status)` because that
 * code lives on the client and shouldn't import server-action helpers anyway.
 */
const LEGAL_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['approved', 'cancelled'],
  approved: ['fulfilled', 'cancelled'],
  fulfilled: [],
  cancelled: [],
};

function bumpRevalidate(id: string) {
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${id}`);
  // The customer's source product pages reflect stock changes, so nudge those
  // too — cheap enough at admin volumes.
  revalidatePath('/products');
}

async function readStatus(id: string): Promise<OrderStatus> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .maybeSingle();
  if (error || !data) throw new Error('Order not found');
  return data.status as OrderStatus;
}

async function transitionTo(id: string, next: OrderStatus) {
  const { user } = await requirePageAccess('orders');
  const current = await readStatus(id);
  if (!LEGAL_TRANSITIONS[current].includes(next)) {
    throw new Error(`Cannot move a ${current} order to ${next}.`);
  }
  const now = new Date().toISOString();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('orders')
    .update({
      status: next,
      updated_at: now,
      status_updated_by: user.id,
      status_updated_at: now,
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  bumpRevalidate(id);
  await notifyStatus(id, next, user.id);
}

export async function approveOrder(id: string) {
  await transitionTo(id, 'approved');
}

export async function fulfillOrder(id: string) {
  await transitionTo(id, 'fulfilled');
}

/**
 * Cancellation is the only transition that restocks. Routed through the
 * `cancel_order` RPC so the stock change and the status change are in the
 * same transaction.
 */
export async function cancelOrder(id: string) {
  const { user } = await requirePageAccess('orders');
  const supabase = createAdminClient();
  const { error } = await supabase.rpc('cancel_order', { p_id: id });
  if (error) {
    if (/BAD_STATUS/.test(error.message)) {
      throw new Error(
        'This order is already fulfilled or cancelled and cannot be cancelled again.',
      );
    }
    throw new Error(error.message);
  }
  // The cancel_order RPC flips the status but doesn't know the admin; stamp the
  // status-change audit in a follow-up update (the row is already cancelled).
  const now = new Date().toISOString();
  await supabase
    .from('orders')
    .update({ status_updated_by: user.id, status_updated_at: now })
    .eq('id', id);
  bumpRevalidate(id);
  await notifyStatus(id, 'cancelled', user.id);
}

const EmailInput = z
  .string()
  .trim()
  .email('Enter a valid email address')
  .max(254)
  .or(z.literal(''));

export type OrderEmailState = { ok?: string; error?: string };

/**
 * Sets (or clears) the email on the order's customer. This is the only place an
 * email enters the system — checkout is phone-only — so the admin adds it here
 * when a customer wants email receipts. Empty string clears it.
 */
export async function setCustomerEmail(
  _prev: OrderEmailState,
  fd: FormData,
): Promise<OrderEmailState> {
  await requirePageAccess('orders');
  const customerId = String(fd.get('customer_id') ?? '');
  const orderId = String(fd.get('order_id') ?? '');
  const parsed = EmailInput.safeParse(fd.get('email') ?? '');
  if (!customerId) return { error: 'Missing customer.' };
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? 'Invalid email' };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('customers')
    .update({ email: parsed.data ? parsed.data : null })
    .eq('id', customerId);
  if (error) return { error: error.message };

  if (orderId) revalidatePath(`/admin/orders/${orderId}`);
  return { ok: parsed.data ? 'Email saved.' : 'Email cleared.' };
}

/**
 * Manually (re)sends a system order email for this order. Returns a friendly
 * status — including the dev "logged" fallback when no Resend key is set.
 */
export async function sendOrderEmailManual(
  _prev: OrderEmailState,
  fd: FormData,
): Promise<OrderEmailState> {
  const { user } = await requirePageAccess('orders');
  const orderId = String(fd.get('order_id') ?? '');
  const slug = String(fd.get('slug') ?? '');
  if (!orderId || !slug) return { error: 'Missing order or template.' };

  const result = await sendOrderEmail({ orderId, slug, sentBy: user.id });
  revalidatePath(`/admin/orders/${orderId}`);
  if (!result) {
    return { error: 'No email on file for this customer (or the template is inactive).' };
  }
  if (result.status === 'sent') return { ok: 'Email sent.' };
  if (result.status === 'logged') {
    return { ok: 'Logged (not delivered): set RESEND_API_KEY to send for real.' };
  }
  return { error: result.error ?? 'Could not send the email.' };
}

const NotesInput = z.string().max(4000, 'Notes are too long').optional().nullable();

export async function updateOrderNotes(id: string, notes: string | null) {
  await requirePageAccess('orders');
  const parsed = NotesInput.safeParse(notes);
  if (!parsed.success) throw new Error(parsed.error.errors[0]?.message ?? 'Invalid notes');
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('orders')
    .update({ admin_notes: parsed.data?.toString().trim() || null })
    .eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/orders/${id}`);
}
