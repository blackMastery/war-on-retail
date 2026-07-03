'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requirePageAccess } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';
import type { Json, ProductImageMeta, ProductOption } from '@/types/database';

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
  // JSON-encoded ProductOption[] and variant matrix rows from VariantsField.
  options_json: z.string().optional().nullable(),
  variants_json: z.string().optional().nullable(),
  meta_title: z.string().optional().nullable(),
  meta_description: z.string().optional().nullable(),
  meta_keywords: z.string().optional().nullable(),
});

/** One matrix row as VariantsField serialises it (numbers travel as strings). */
const VariantInput = z.object({
  id: z.string().uuid().optional(),
  option_values: z.record(z.string(), z.string().min(1)),
  sku: z.string().default(''),
  price: z.string().default(''),
  compare_at_price: z.string().default(''),
  stock_quantity: z.string().default(''),
  image_url: z.string().default(''),
  is_active: z.boolean().default(true),
  position: z.number().int().nonnegative().default(0),
});

type VariantPayload = {
  id?: string;
  option_values: Record<string, string>;
  sku: string | null;
  price: number;
  compare_at_price: number | null;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
  position: number;
};

/**
 * Parse + cross-validate the options/variants JSON blobs from the form.
 * Returns a user-facing error string on the first problem — the matrix UI
 * shows a single error slot, so one message at a time is enough.
 */
function parseVariantsPayload(
  optionsJson: string | null | undefined,
  variantsJson: string | null | undefined,
): { options: ProductOption[]; variants: VariantPayload[] } | { error: string } {
  let options: ProductOption[] = [];
  let rows: z.infer<typeof VariantInput>[] = [];
  try {
    const rawOptions: unknown = optionsJson ? JSON.parse(optionsJson) : [];
    const rawVariants: unknown = variantsJson ? JSON.parse(variantsJson) : [];
    const optionsCheck = z
      .array(z.object({ name: z.string().min(1), values: z.array(z.string().min(1)).min(1) }))
      .max(3)
      .safeParse(rawOptions);
    const variantsCheck = z.array(VariantInput).safeParse(rawVariants);
    if (!optionsCheck.success || !variantsCheck.success) {
      return { error: 'Variants payload was malformed. Refresh and try again.' };
    }
    options = optionsCheck.data;
    rows = variantsCheck.data;
  } catch {
    return { error: 'Variants payload was malformed. Refresh and try again.' };
  }

  if ((options.length === 0) !== (rows.length === 0)) {
    return { error: 'Variants payload was malformed. Refresh and try again.' };
  }
  if (rows.length === 0) return { options: [], variants: [] };

  const names = options.map((o) => o.name.trim());
  if (new Set(names.map((n) => n.toLowerCase())).size !== names.length) {
    return { error: 'Option names must be unique.' };
  }
  for (const o of options) {
    if (new Set(o.values.map((v) => v.toLowerCase())).size !== o.values.length) {
      return { error: `Values for "${o.name}" must be unique.` };
    }
  }

  const nameSet = new Set(names);
  const seenCombos = new Set<string>();
  const seenSkus = new Set<string>();
  const variants: VariantPayload[] = [];

  for (const row of rows) {
    const keys = Object.keys(row.option_values);
    if (keys.length !== nameSet.size || keys.some((k) => !nameSet.has(k))) {
      return { error: 'Every variant must set a value for each option.' };
    }
    for (const opt of options) {
      if (!opt.values.includes(row.option_values[opt.name])) {
        return { error: `Variant value "${row.option_values[opt.name]}" is not a listed ${opt.name}.` };
      }
    }
    const comboKey = JSON.stringify(
      Object.fromEntries(Object.entries(row.option_values).sort(([a], [b]) => a.localeCompare(b))),
    );
    if (seenCombos.has(comboKey)) {
      return { error: 'Duplicate variant combination in the matrix.' };
    }
    seenCombos.add(comboKey);

    const label = Object.values(row.option_values).join(' / ');
    const price = Number(row.price);
    if (row.price.trim() === '' || !Number.isFinite(price) || price < 0) {
      return { error: `Variant "${label}" needs a valid price.` };
    }
    const compareAt = row.compare_at_price.trim() === '' ? null : Number(row.compare_at_price);
    if (compareAt !== null && (!Number.isFinite(compareAt) || compareAt < 0)) {
      return { error: `Variant "${label}" has an invalid compare-at price.` };
    }
    const stock = row.stock_quantity.trim() === '' ? 0 : Number(row.stock_quantity);
    if (!Number.isInteger(stock) || stock < 0) {
      return { error: `Variant "${label}" has an invalid stock quantity.` };
    }
    const sku = row.sku.trim() || null;
    if (sku) {
      if (seenSkus.has(sku.toLowerCase())) {
        return { error: `Variant SKU "${sku}" is used more than once.` };
      }
      seenSkus.add(sku.toLowerCase());
    }

    variants.push({
      id: row.id,
      option_values: row.option_values,
      sku,
      price,
      compare_at_price: compareAt,
      stock_quantity: stock,
      image_url: row.image_url.trim() || null,
      is_active: row.is_active,
      position: row.position,
    });
  }

  return { options, variants };
}

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

  // Only real web URLs may be stored — the images field submits placeholder
  // "pending:<filename>" strings for in-flight/failed uploads, and anything
  // non-http would crash next/image on the storefront.
  const isWebUrl = (u: string) => /^https?:\/\//.test(u);
  const featuredImageUrl =
    input.featured_image_url && isWebUrl(input.featured_image_url)
      ? input.featured_image_url
      : null;

  // Parse the gallery URL list. Empty/missing → empty array.
  let imageUrls: string[] = [];
  if (input.image_urls_json) {
    try {
      const parsed = JSON.parse(input.image_urls_json);
      if (Array.isArray(parsed)) {
        imageUrls = parsed.filter((u): u is string => typeof u === 'string' && isWebUrl(u));
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
          ...(featuredImageUrl ? [featuredImageUrl] : []),
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

  const variantsResult = parseVariantsPayload(input.options_json, input.variants_json);
  if ('error' in variantsResult) {
    return {
      error: 'Please correct the highlighted fields.',
      fieldErrors: { variants: variantsResult.error },
      values: raw,
      formKey: String(Date.now()),
    };
  }
  const { options, variants } = variantsResult;
  const hasVariants = variants.length > 0;

  const payload = {
    name: input.name,
    slug,
    sku: input.sku || null,
    short_description: input.short_description || null,
    description: input.description || null,
    price: input.price,
    compare_at_price: input.compare_at_price ?? null,
    cost: input.cost ?? null,
    // With variants, stock is owned by the variant rows — a DB trigger keeps
    // the product total in sync, so writing it here would be clobbered anyway.
    ...(hasVariants ? {} : { stock_quantity: input.stock_quantity }),
    low_stock_threshold: input.low_stock_threshold,
    track_inventory: input.track_inventory,
    category_id: input.category_id || null,
    brand_id: input.brand_id || null,
    featured_image_url: featuredImageUrl,
    featured_image_alt: clean(input.featured_image_alt),
    image_urls: imageUrls,
    image_meta: imageMeta,
    is_active: input.is_active,
    is_featured: input.is_featured,
    is_pre_order_enabled: input.is_pre_order_enabled,
    pre_order_message: clean(input.pre_order_message),
    specifications: specifications as Json,
    options,
    meta_title: clean(input.meta_title),
    meta_description: clean(input.meta_description),
    meta_keywords: clean(input.meta_keywords),
  };

  const supabase = createAdminClient();
  let productId = input.id;
  if (input.id) {
    const { error } = await supabase
      .from('products')
      .update({ ...payload, modified_by: user.id })
      .eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const { data: created, error } = await supabase
      .from('products')
      .insert({ ...payload, created_by: user.id, modified_by: user.id })
      .select('id')
      .single();
    if (error) return { error: error.message };
    productId = created.id;
  }

  const variantsError = await syncVariants(supabase, productId!, variants, raw);
  if (variantsError) return variantsError;

  revalidatePath('/admin/products');
  revalidatePath('/');
  revalidatePath(`/products/${slug}`);
  redirect('/admin/products');
}

/**
 * Diff the submitted matrix against the DB: update rows that kept their id,
 * insert new combinations, delete combinations that left the matrix. Deletes
 * run first so a freed unique SKU can be reused by a renamed combination.
 * Order history is safe — order_items.variant_id is `on delete set null`.
 */
async function syncVariants(
  supabase: ReturnType<typeof createAdminClient>,
  productId: string,
  variants: VariantPayload[],
  raw: Record<string, string>,
): Promise<ProductFormState | null> {
  const fail = (error: { message: string }): ProductFormState => {
    if (error.message.includes('product_variants_sku_key')) {
      return {
        error: 'Please correct the highlighted fields.',
        fieldErrors: { variants: 'A variant SKU is already used by another product.' },
        values: raw,
        formKey: String(Date.now()),
      };
    }
    return { error: error.message };
  };

  const { data: existingRows, error: readError } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', productId);
  if (readError) return { error: readError.message };

  const existingIds = new Set((existingRows ?? []).map((r) => r.id));
  const updates = variants.filter((v) => v.id && existingIds.has(v.id));
  const inserts = variants.filter((v) => !v.id || !existingIds.has(v.id));
  const keepIds = new Set(updates.map((v) => v.id as string));
  const removeIds = [...existingIds].filter((id) => !keepIds.has(id));

  if (removeIds.length > 0) {
    const { error } = await supabase
      .from('product_variants')
      .delete()
      .eq('product_id', productId)
      .in('id', removeIds);
    if (error) return fail(error);
  }
  for (const v of updates) {
    const { error } = await supabase
      .from('product_variants')
      .update({
        option_values: v.option_values,
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock_quantity: v.stock_quantity,
        image_url: v.image_url,
        is_active: v.is_active,
        position: v.position,
      })
      .eq('id', v.id as string)
      .eq('product_id', productId);
    if (error) return fail(error);
  }
  if (inserts.length > 0) {
    const { error } = await supabase.from('product_variants').insert(
      inserts.map((v) => ({
        product_id: productId,
        option_values: v.option_values,
        sku: v.sku,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock_quantity: v.stock_quantity,
        image_url: v.image_url,
        is_active: v.is_active,
        position: v.position,
      })),
    );
    if (error) return fail(error);
  }
  return null;
}

export async function deleteProduct(id: string) {
  await requirePageAccess('products');
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
}
