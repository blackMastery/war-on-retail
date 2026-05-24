'use server';

import { revalidatePath } from 'next/cache';
import Papa from 'papaparse';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/auth';
import { generateSlug } from '@/lib/utils';
import type { Json } from '@/types/database';

export type ImportRow = {
  name?: string;
  slug?: string;
  sku?: string;
  price?: string;
  compare_at_price?: string;
  category?: string;
  brand?: string;
  short_description?: string;
  description?: string;
  stock_quantity?: string;
  is_featured?: string;
  is_active?: string;
  image_1?: string;
  image_2?: string;
  image_3?: string;
  image_4?: string;
  specifications?: string;
};

export type ImportResult = {
  ok: boolean;
  inserted: number;
  updated: number;
  errors: { row: number; message: string }[];
};

function asBool(v: string | undefined, dflt = true): boolean {
  if (v == null || v === '') return dflt;
  const s = v.toString().trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'y';
}

function asNumber(v: string | undefined): number | null {
  if (v == null || v.toString().trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function importProductsCsv(_: unknown, fd: FormData): Promise<ImportResult> {
  await requireAdmin();

  const file = fd.get('csv') as File | null;
  if (!file || file.size === 0) {
    return { ok: false, inserted: 0, updated: 0, errors: [{ row: 0, message: 'No file uploaded.' }] };
  }
  const text = await file.text();
  const parsed = Papa.parse<ImportRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  if (parsed.errors.length) {
    return {
      ok: false,
      inserted: 0,
      updated: 0,
      errors: parsed.errors.slice(0, 10).map((e) => ({ row: e.row ?? 0, message: e.message })),
    };
  }

  const supabase = createAdminClient();

  // Load taxonomy once so we can resolve names → ids on each row.
  const [{ data: cats }, { data: brands }] = await Promise.all([
    supabase.from('categories').select('id, name, slug'),
    supabase.from('brands').select('id, name, slug'),
  ]);
  const catBy = new Map<string, string>();
  cats?.forEach((c) => {
    catBy.set(c.name.toLowerCase(), c.id);
    catBy.set(c.slug, c.id);
  });
  const brandBy = new Map<string, string>();
  brands?.forEach((b) => {
    brandBy.set(b.name.toLowerCase(), b.id);
    brandBy.set(b.slug, b.id);
  });

  let inserted = 0;
  let updated = 0;
  const errors: ImportResult['errors'] = [];

  for (let i = 0; i < parsed.data.length; i++) {
    const r = parsed.data[i];
    const rowNo = i + 2; // +2: header is row 1, data starts at row 2
    try {
      if (!r.name?.trim()) {
        errors.push({ row: rowNo, message: 'Missing name' });
        continue;
      }
      const price = asNumber(r.price);
      if (price == null) {
        errors.push({ row: rowNo, message: 'Invalid or missing price' });
        continue;
      }

      const slug = (r.slug?.trim() || generateSlug(r.name)).slice(0, 120);
      const images = [r.image_1, r.image_2, r.image_3, r.image_4].filter(Boolean) as string[];

      let specifications: Record<string, unknown> = {};
      if (r.specifications?.trim()) {
        try {
          const obj = JSON.parse(r.specifications);
          if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
            specifications = obj as Record<string, unknown>;
          }
        } catch {
          errors.push({ row: rowNo, message: 'specifications is not valid JSON' });
          continue;
        }
      }

      const categoryId = r.category ? catBy.get(r.category.toLowerCase()) ?? null : null;
      const brandId = r.brand ? brandBy.get(r.brand.toLowerCase()) ?? null : null;

      const payload = {
        name: r.name.trim(),
        slug,
        sku: r.sku?.trim() || null,
        price,
        compare_at_price: asNumber(r.compare_at_price),
        stock_quantity: Math.max(0, asNumber(r.stock_quantity) ?? 0),
        category_id: categoryId,
        brand_id: brandId,
        short_description: r.short_description?.trim() || null,
        description: r.description?.trim() || null,
        featured_image_url: images[0] ?? null,
        image_urls: images.slice(1),
        specifications: specifications as Json,
        is_featured: asBool(r.is_featured, false),
        is_active: asBool(r.is_active, true),
        track_inventory: true,
        low_stock_threshold: 5,
      };

      // Upsert by slug (slug has a unique index).
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (existing) {
        const { error } = await supabase.from('products').update(payload).eq('id', existing.id);
        if (error) errors.push({ row: rowNo, message: error.message });
        else updated++;
      } else {
        const { error } = await supabase.from('products').insert(payload);
        if (error) errors.push({ row: rowNo, message: error.message });
        else inserted++;
      }
    } catch (e: any) {
      errors.push({ row: rowNo, message: e?.message ?? 'Unknown error' });
    }
  }

  revalidatePath('/admin/products');
  revalidatePath('/');
  return { ok: errors.length === 0, inserted, updated, errors };
}
