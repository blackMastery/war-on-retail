'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';
import type { Json, ProductImageMeta } from '@/types/database';

const ImageMetaShape = z.record(
  z.string(),
  z.object({
    alt: z.string().nullable().optional().default(null),
    caption: z.string().nullable().optional().default(null),
    keywords: z.string().nullable().optional().default(null),
  }),
);

const ProductInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, 'Name is required'),
  slug: z.string().optional(),
  sku: z.string().optional().nullable(),
  short_description: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  price: z.coerce.number().nonnegative(),
  compare_at_price: z.coerce.number().nonnegative().optional().nullable(),
  cost: z.coerce.number().nonnegative().optional().nullable(),
  stock_quantity: z.coerce.number().int().nonnegative().default(0),
  low_stock_threshold: z.coerce.number().int().nonnegative().default(5),
  track_inventory: z.coerce.boolean().default(true),
  category_id: z.string().uuid().optional().nullable().or(z.literal('')),
  brand_id: z.string().uuid().optional().nullable().or(z.literal('')),
  featured_image_url: z.string().url().optional().nullable().or(z.literal('')),
  featured_image_alt: z.string().optional().nullable(),
  // JSON-encoded string[] of gallery image URLs (everything except the featured).
  image_urls_json: z.string().optional().nullable(),
  // JSON-encoded Record<url, { alt, caption, keywords }> covering every image
  // (gallery + featured). Orphans are pruned server-side.
  image_meta_json: z.string().optional().nullable(),
  is_active: z.coerce.boolean().default(true),
  is_featured: z.coerce.boolean().default(false),
  is_pre_order_enabled: z.coerce.boolean().default(false),
  pre_order_message: z.string().optional().nullable(),
  specifications_json: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_keywords: z.string().optional().nullable(),
});

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Raw submitted values — used to repopulate the form after validation errors. */
  values?: Record<string, string>;
  /** Bumps when validation fails so inputs remount with `values`. */
  formKey?: string;
};

function parseForm(fd: FormData): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const [key, value] of fd.entries()) {
    raw[key] = typeof value === 'string' ? value : value.name;
  }
  // checkboxes are absent when unchecked — normalise booleans
  raw.track_inventory = String(fd.get('track_inventory') === 'on' || fd.get('track_inventory') === 'true');
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  raw.is_featured = String(fd.get('is_featured') === 'on' || fd.get('is_featured') === 'true');
  raw.is_pre_order_enabled = String(
    fd.get('is_pre_order_enabled') === 'on' || fd.get('is_pre_order_enabled') === 'true',
  );
  return raw;
}

export async function upsertProduct(_prev: ProductFormState, fd: FormData): Promise<ProductFormState> {
  const { user } = await requirePageAccess('products');
  const raw = parseForm(fd);
  const parsed = ProductInput.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return {
      error: 'Please correct the highlighted fields.',
      fieldErrors,
      values: raw,
      formKey: String(Date.now()),
    };
  }

  const input = parsed.data;
  const slug = (input.slug?.trim() || generateSlug(input.name)).slice(0, 120);

  let specifications: Record<string, unknown> = {};
  if (input.specifications_json) {
    try {
      const parsed = JSON.parse(input.specifications_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        specifications = parsed as Record<string, unknown>;
      }
    } catch {
      return { error: 'Specifications must be valid JSON (object).' };
    }
  }

  // Parse the gallery URL list. Empty/missing → empty array.
  let imageUrls: string[] = [];
  if (input.image_urls_json) {
    try {
      const parsed = JSON.parse(input.image_urls_json);
      if (Array.isArray(parsed)) {
        imageUrls = parsed.filter((u): u is string => typeof u === 'string' && u.length > 0);
      }
    } catch {
      return { error: 'Image gallery payload was malformed. Refresh and try again.' };
    }
  }

  // Per-image metadata: validate shape, then prune anything not referenced
  // by the current featured/gallery URLs (admins who delete an image
  // shouldn't keep stale alt-text rows hanging around).
  let imageMeta: Record<string, ProductImageMeta> = {};
  if (input.image_meta_json) {
    try {
      const parsed = JSON.parse(input.image_meta_json);
      const checked = ImageMetaShape.safeParse(parsed);
      if (checked.success) {
        const live = new Set<string>([
          ...(input.featured_image_url ? [input.featured_image_url] : []),
          ...imageUrls,
        ]);
        const clean = (v: string | null | undefined) =>
          v && v.trim() ? v.trim() : null;
        for (const [url, meta] of Object.entries(checked.data)) {
          if (!live.has(url)) continue;
          const alt = clean(meta.alt);
          const caption = clean(meta.caption);
          const keywords = clean(meta.keywords);
          if (alt || caption || keywords) {
            imageMeta[url] = { alt, caption, keywords };
          }
        }
      }
    } catch {
      // Bad JSON → fall through with imageMeta = {}. We deliberately don't
      // hard-fail so a malformed JSON blob can't lock the admin out of the
      // edit page (they can re-fill the alt fields and resave).
    }
  }

  const clean = (s: string | null | undefined) =>
    s && s.trim() ? s.trim() : null;

  const payload = {
    name: input.name,
    slug,
    sku: input.sku || null,
    short_description: input.short_description || null,
    description: input.description || null,
    price: input.price,
    compare_at_price: input.compare_at_price ?? null,
    cost: input.cost ?? null,
    stock_quantity: input.stock_quantity,
    low_stock_threshold: input.low_stock_threshold,
    track_inventory: input.track_inventory,
    category_id: input.category_id || null,
    brand_id: input.brand_id || null,
    featured_image_url: input.featured_image_url || null,
    featured_image_alt: clean(input.featured_image_alt),
    image_urls: imageUrls,
    image_meta: imageMeta,
    is_active: input.is_active,
    is_featured: input.is_featured,
    is_pre_order_enabled: input.is_pre_order_enabled,
    pre_order_message: clean(input.pre_order_message),
    specifications: specifications as Json,
    meta_title: clean(input.meta_title),
    meta_description: clean(input.meta_description),
    meta_keywords: clean(input.meta_keywords),
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase
      .from('products')
      .update({ ...payload, modified_by: user.id })
      .eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('products')
      .insert({ ...payload, created_by: user.id, modified_by: user.id });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/products');
  revalidatePath('/');
  revalidatePath(`/products/${slug}`);
  redirect('/admin/products');
}

export async function deleteProduct(id: string) {
  await requirePageAccess('products');
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
}
