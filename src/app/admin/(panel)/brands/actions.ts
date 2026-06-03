'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';

const BrandInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  description: z.string().optional().nullable(),
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
  website_url: z.string().url('Must be a full https:// URL').optional().nullable().or(z.literal('')),
  display_order: z.coerce.number().int().default(0),
  is_active: z.coerce.boolean().default(true),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_keywords: z.string().optional().nullable(),
});

export type BrandFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  return raw;
}

export async function upsertBrand(
  _prev: BrandFormState,
  fd: FormData,
): Promise<BrandFormState> {
  const { user } = await requirePageAccess('brands');
  const parsed = BrandInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
  }

  const input = parsed.data;
  const slug = (input.slug?.trim() || generateSlug(input.name)).slice(0, 120);
  const clean = (s: string | null | undefined) =>
    s && s.trim() ? s.trim() : null;
  const payload = {
    name: input.name,
    slug,
    description: input.description?.trim() || null,
    logo_url: input.logo_url && input.logo_url !== '' ? input.logo_url : null,
    website_url: input.website_url && input.website_url !== '' ? input.website_url : null,
    display_order: input.display_order,
    is_active: input.is_active,
    meta_title: clean(input.meta_title),
    meta_description: clean(input.meta_description),
    meta_keywords: clean(input.meta_keywords),
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase
      .from('brands')
      .update({ ...payload, modified_by: user.id })
      .eq('id', input.id);
    if (error) {
      return uniqueViolationToFieldError(error.message, slug) ?? { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from('brands')
      .insert({ ...payload, created_by: user.id, modified_by: user.id });
    if (error) {
      return uniqueViolationToFieldError(error.message, slug) ?? { error: error.message };
    }
  }

  revalidatePath('/admin/brands');
  revalidatePath('/brands');
  revalidatePath(`/brands/${slug}`);
  redirect('/admin/brands');
}

/**
 * Soft-deletes by default — flips `is_active` off so the brand vanishes from
 * the storefront but the row (and any products keyed to it) survive. Pass
 * `hard: true` to remove the row permanently; the FK on `products.brand_id`
 * is ON DELETE SET NULL so products survive either way.
 */
export async function deleteBrand(id: string, opts: { hard?: boolean } = {}) {
  await requirePageAccess('brands');
  const supabase = createAdminClient();
  const { error } = opts.hard
    ? await supabase.from('brands').delete().eq('id', id)
    : await supabase.from('brands').update({ is_active: false }).eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/brands');
  revalidatePath('/brands');
}

/**
 * PostgREST surfaces unique-index violations as messages containing the
 * column name. Pick those off and route to the right field so the user
 * sees "Slug already taken" rather than a raw Postgres dump.
 */
function uniqueViolationToFieldError(
  message: string,
  slug: string,
): BrandFormState | null {
  if (!message.includes('duplicate key') && !message.includes('unique')) return null;
  if (message.includes('slug')) {
    return {
      error: `A brand with slug "${slug}" already exists.`,
      fieldErrors: { slug: 'Already taken — change the name or set an explicit slug.' },
    };
  }
  if (message.includes('name')) {
    return {
      error: 'A brand with that name already exists.',
      fieldErrors: { name: 'Already taken.' },
    };
  }
  return { error: message };
}
