'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';

// Mirrors the DB check constraint in `20260101000800_promotions_link.sql`.
// Allows: internal path (/...), https?:// URL, or empty (display-only).
const LinkUrlSchema = z
  .string()
  .trim()
  .refine(
    (v) => v === '' || /^\/[^\s]*$/.test(v) || /^https?:\/\/[^\s]+$/.test(v),
    'Use a path starting with "/" (e.g. /products/your-slug) or a full https:// URL',
  )
  .optional()
  .nullable();

const PromotionInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, 'Title is required'),
  image_url: z.string().url('Upload an image first'),
  link_url: LinkUrlSchema,
  is_featured: z.coerce.boolean().default(false),
  display_order: z.coerce.number().int().default(0),
  // datetime-local inputs return e.g. "2026-05-25T10:00" — z.string() lets that through;
  // we normalise to ISO below.
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
});

export type PromotionFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function normaliseDate(v: string | null | undefined): string | null {
  if (!v) return null;
  const trimmed = v.trim();
  if (!trimmed) return null;
  // The browser's <input type="datetime-local"> produces "YYYY-MM-DDTHH:MM"
  // (no timezone). Treat that as local time; ISO conversion makes timestamptz happy.
  const d = new Date(trimmed);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  raw.is_featured = String(fd.get('is_featured') === 'on' || fd.get('is_featured') === 'true');
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  return raw;
}

export async function upsertPromotion(
  _prev: PromotionFormState,
  fd: FormData,
): Promise<PromotionFormState> {
  const { user } = await requirePageAccess('promotions');
  const parsed = PromotionInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const payload = {
    title: input.title,
    image_url: input.image_url,
    link_url: input.link_url && input.link_url !== '' ? input.link_url : null,
    is_featured: input.is_featured,
    display_order: input.display_order,
    starts_at: normaliseDate(input.starts_at),
    ends_at: normaliseDate(input.ends_at),
    is_active: input.is_active,
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase
      .from('promotions')
      .update({ ...payload, modified_by: user.id })
      .eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('promotions')
      .insert({ ...payload, created_by: user.id, modified_by: user.id });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/promotions');
  revalidatePath('/');
  redirect('/admin/promotions');
}

export async function deletePromotion(id: string) {
  await requirePageAccess('promotions');
  const supabase = createAdminClient();
  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/promotions');
  revalidatePath('/');
}
