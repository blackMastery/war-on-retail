'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';

/**
 * Server Actions for the /admin/discounts CRUD. Mirrors the promotions section:
 * `useActionState`-compatible return shape, Zod validation, service-role client,
 * `requirePageAccess('discounts')` on every mutation.
 */

const DISCOUNT_TYPES = ['percentage', 'fixed_amount', 'bogo'] as const;

/** Coerce an empty/blank form field to null; otherwise the trimmed string. */
const emptyToNull = z
  .string()
  .optional()
  .nullable()
  .transform((v) => {
    const t = (v ?? '').trim();
    return t === '' ? null : t;
  });

/** A non-negative money/number field that may be blank (→ null). */
const optionalNonNeg = emptyToNull.transform((v, ctx) => {
  if (v === null) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a number ≥ 0' });
    return z.NEVER;
  }
  return n;
});

const DiscountInput = z
  .object({
    id: z.string().uuid().optional(),
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters')
      .max(64)
      .transform((v) => v.toUpperCase()),
    description: emptyToNull,
    discount_type: z.enum(DISCOUNT_TYPES),
    // Validated against the type below.
    discount_value: z.coerce.number().min(0, 'Value must be ≥ 0'),
    min_purchase_amount: optionalNonNeg,
    max_discount_amount: optionalNonNeg,
    usage_limit: optionalNonNeg,
    per_customer_limit: optionalNonNeg,
    valid_from: emptyToNull,
    valid_until: emptyToNull,
    is_active: z.coerce.boolean().default(true),
  })
  .superRefine((val, ctx) => {
    if (val.discount_type === 'percentage' || val.discount_type === 'bogo') {
      if (val.discount_value < 0 || val.discount_value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['discount_value'],
          message: 'Percentage must be between 0 and 100',
        });
      }
    }
  });

export type DiscountFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** datetime-local ("YYYY-MM-DDTHH:MM", local) → ISO string for timestamptz. */
function normaliseDate(v: string | null): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  // Checkboxes are absent when unchecked.
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  return raw;
}

export async function upsertDiscountCode(
  _prev: DiscountFormState,
  fd: FormData,
): Promise<DiscountFormState> {
  const { user } = await requirePageAccess('discounts');

  const parsed = DiscountInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const payload = {
    code: input.code,
    description: input.description,
    discount_type: input.discount_type,
    discount_value: input.discount_value,
    min_purchase_amount: input.min_purchase_amount,
    max_discount_amount: input.max_discount_amount,
    usage_limit: input.usage_limit,
    per_customer_limit: input.per_customer_limit,
    valid_from: normaliseDate(input.valid_from),
    valid_until: normaliseDate(input.valid_until),
    is_active: input.is_active,
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase
      .from('discount_codes')
      .update({ ...payload, modified_by: user.id })
      .eq('id', input.id);
    if (error) return { error: mapDbError(error.message) };
  } else {
    const { error } = await supabase
      .from('discount_codes')
      .insert({ ...payload, created_by: user.id, modified_by: user.id });
    if (error) return { error: mapDbError(error.message) };
  }

  revalidatePath('/admin/discounts');
  redirect('/admin/discounts');
}

export async function deleteDiscountCode(id: string) {
  await requirePageAccess('discounts');
  const supabase = createAdminClient();
  const { error } = await supabase.from('discount_codes').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/discounts');
}

/** Friendlier message for the common unique-violation on `code`. */
function mapDbError(msg: string): string {
  if (msg.includes('discount_codes_code_key') || msg.toLowerCase().includes('duplicate')) {
    return 'A discount code with that name already exists.';
  }
  return msg;
}
