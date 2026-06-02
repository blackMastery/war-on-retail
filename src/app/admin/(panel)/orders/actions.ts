'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import type { OrderStatus } from '@/types/database';

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
  await requirePageAccess('orders');
  const current = await readStatus(id);
  if (!LEGAL_TRANSITIONS[current].includes(next)) {
    throw new Error(`Cannot move a ${current} order to ${next}.`);
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('orders')
    .update({ status: next, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
  bumpRevalidate(id);
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
  await requirePageAccess('orders');
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
  bumpRevalidate(id);
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
