'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';
import type { Json } from '@/types/database';

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
  category_id: z.string().uuid().optional().nullable(),
  brand_id: z.string().uuid().optional().nullable(),
  featured_image_url: z.string().url().optional().nullable().or(z.literal('')),
  is_active: z.coerce.boolean().default(true),
  is_featured: z.coerce.boolean().default(false),
  specifications_json: z.string().optional().nullable(),
});

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseForm(fd: FormData) {
  const raw = Object.fromEntries(fd.entries());
  // checkboxes are absent when unchecked — normalise booleans
  raw.track_inventory = String(fd.get('track_inventory') === 'on' || fd.get('track_inventory') === 'true');
  raw.is_active = String(fd.get('is_active') === 'on' || fd.get('is_active') === 'true');
  raw.is_featured = String(fd.get('is_featured') === 'on' || fd.get('is_featured') === 'true');
  return raw;
}

export async function upsertProduct(_prev: ProductFormState, fd: FormData): Promise<ProductFormState> {
  await requireAdmin();
  const parsed = ProductInput.safeParse(parseForm(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path.join('.')] = issue.message;
    }
    return { error: 'Please correct the highlighted fields.', fieldErrors };
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
    is_active: input.is_active,
    is_featured: input.is_featured,
    specifications: specifications as Json,
  };

  const supabase = createAdminClient();
  if (input.id) {
    const { error } = await supabase.from('products').update(payload).eq('id', input.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from('products').insert({ ...payload, image_urls: [] });
    if (error) return { error: error.message };
  }

  revalidatePath('/admin/products');
  revalidatePath('/');
  revalidatePath(`/products/${slug}`);
  redirect('/admin/products');
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw new Error(error.message);
  revalidatePath('/admin/products');
}
