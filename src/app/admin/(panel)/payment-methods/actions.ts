'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';

const PaymentMethodInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  display_order: z.coerce.number().int().default(0),
  is_active: z.coerce.boolean().default(true),
});

export type PaymentMethodFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  return raw;
}

export async function upsertPaymentMethod(
  _prev: PaymentMethodFormState,
  fd: FormData,
): Promise<PaymentMethodFormState> {
  await requireAdmin();
  const parsed = PaymentMethodInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const payload = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    display_order: input.display_order,
    is_active: input.is_active,
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase.from('payment_methods').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('payment_methods').insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/payment-methods');
  revalidatePath('/checkout');
  redirect('/admin/payment-methods');
}

/**
 * Soft-deletes by default. Hard-delete refused if any orders reference the
 * method — the FK on `orders.payment_method_id` is `ON DELETE RESTRICT`, so
 * Postgres will reject it anyway; we surface a friendly message instead of
 * the raw error.
 */
export async function deletePaymentMethod(id: string, opts: { hard?: boolean } = {}) {
  await requireAdmin();
  const supabase = createAdminClient();

  if (opts.hard) {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id);
    if (error) {
      if (/violates foreign key/.test(error.message)) {
        throw new Error(
          'Cannot hard-delete a payment method that is referenced by orders. Hide it instead.',
        );
      }
      throw new Error(error.message);
    }
  } else {
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: false })
      .eq('id', id);
    if (error) throw new Error(error.message);
  }

  revalidatePath('/admin/payment-methods');
  revalidatePath('/checkout');
}
