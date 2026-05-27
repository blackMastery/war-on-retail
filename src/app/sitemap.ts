import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { siteConfig } from '@/config/site';

/**
 * Sitemap for Google + other crawlers.
 *
 * Strategy:
 *   - Static, evergreen pages (homepage, products list, categories list,
 *     brands list, deals, faq, contact, about) — fixed priorities.
 *   - Per-product, per-category, per-brand entries with `lastModified`
 *     pulled from each row's `updated_at` (or `created_at` fallback).
 *
 * Excluded by design:
 *   - `/admin/*`, `/api/*`           — disallowed in robots.ts
 *   - `/cart`, `/wishlist`           — per-visitor state, not indexable
 *   - `/search`                      — dynamic; query-string variants would
 *                                       multiply infinitely and pollute indexes
 *   - `/products/[slug]?…`           — filters/pagination URLs; the base
 *                                       category/brand/product pages cover the
 *                                       index needs, query variants don't add
 *                                       indexable content
 *
 * Next.js validates the output and serialises to `/sitemap.xml`. For very
 * large catalogues (>50k URLs total) we'd switch to a multi-sitemap by
 * returning `[]` from this file and adding `sitemap-products.ts`,
 * `sitemap-categories.ts`, etc. with `generateSitemaps()`. For now, one file.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/+$/, '');
  const supabase = await createClient();

  // Fire the three taxonomy/product queries in parallel.
  const [{ data: products }, { data: categories }, { data: brands }] = await Promise.all([
    supabase
      .from('products')
      .select('slug, updated_at, created_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('categories')
      .select('slug, updated_at, created_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
    supabase
      .from('brands')
      .select('slug, updated_at, created_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${base}/products`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/categories`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/brands`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/deals`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${base}/faq`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/contact`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/about`, changeFrequency: 'yearly', priority: 0.3 },
  ];

  const productPages: MetadataRoute.Sitemap = (products ?? []).map((p) => ({
    url: `${base}/products/${p.slug}`,
    lastModified: new Date(p.updated_at ?? p.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  const categoryPages: MetadataRoute.Sitemap = (categories ?? []).map((c) => ({
    url: `${base}/categories/${c.slug}`,
    lastModified: new Date(c.updated_at ?? c.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  const brandPages: MetadataRoute.Sitemap = (brands ?? []).map((b) => ({
    url: `${base}/brands/${b.slug}`,
    lastModified: new Date(b.updated_at ?? b.created_at),
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...brandPages];
}
