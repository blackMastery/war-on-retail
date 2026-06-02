import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getStoreSettings } from '@/lib/store-settings';

/**
 * Sitemap for Google + other crawlers.
 *
 * Everything in here is driven by what an admin configured, not by hardcoded
 * constants:
 *
 *   - **Base URL** comes from `store_settings.url` (with the env-var fallback
 *     `getStoreSettings()` already handles), so changing the canonical URL in
 *     `/admin/settings` flows through immediately.
 *   - **Static pages** are filtered out of `page_seo` by `robots_index = true`,
 *     so toggling a page to "Hidden" on `/admin/pages` also removes it from
 *     the sitemap. `lastModified` is the row's own `updated_at`, which ticks
 *     every time the admin edits its meta tags.
 *   - **Catalogue / category / brand entries** are unchanged — each row's
 *     own `updated_at` already reflects admin edits.
 *
 * Excluded by design (these have `robots_index = false` in the seed data and
 * naturally drop out of the static list):
 *   - `/cart`, `/wishlist`           — per-visitor state
 *   - `/checkout`, `/checkout/success` — transactional
 *   - `/search`                      — query-string variants would multiply
 *
 * Also excluded:
 *   - `/admin/*`, `/api/*`           — disallowed in `robots.ts`
 *   - `/products|categories|brands/[slug]?…` filter / page query variants — the
 *     base detail URLs cover the index need.
 */

/**
 * Per-path tuning for `changeFrequency` + `priority`. The base sitemap shape
 * comes from `page_seo`, but how often each route is expected to change is a
 * fairly intrinsic property of the route — admins setting "policy text changed"
 * doesn't make Google crawl /policies daily. Keeping these here keeps the
 * tuning code-side without sacrificing the admin-driven listing.
 *
 * Anything not in the map gets the sensible default below.
 */
const STATIC_TUNING: Record<
  string,
  { changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }
> = {
  '/':                    { changeFrequency: 'daily',   priority: 1.0 },
  '/products':            { changeFrequency: 'daily',   priority: 0.9 },
  '/deals':               { changeFrequency: 'daily',   priority: 0.8 },
  '/categories':          { changeFrequency: 'weekly',  priority: 0.7 },
  '/brands':              { changeFrequency: 'weekly',  priority: 0.7 },
  '/faq':                 { changeFrequency: 'monthly', priority: 0.5 },
  '/contact':             { changeFrequency: 'monthly', priority: 0.5 },
  '/about':               { changeFrequency: 'yearly',  priority: 0.3 },
  '/policies/privacy':    { changeFrequency: 'yearly',  priority: 0.3 },
  '/policies/shipping':   { changeFrequency: 'yearly',  priority: 0.3 },
  '/policies/terms':      { changeFrequency: 'yearly',  priority: 0.3 },
  '/policies/warranty':   { changeFrequency: 'yearly',  priority: 0.3 },
};
const STATIC_DEFAULT = {
  changeFrequency: 'monthly' as const,
  priority: 0.5,
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [settings, supabase] = await Promise.all([getStoreSettings(), createClient()]);
  const base = settings.url.replace(/\/+$/, '');

  // Four parallel queries — page_seo for the static portion plus the three
  // taxonomy/product reads for the dynamic portion.
  const [
    { data: pageRows },
    { data: products },
    { data: categories },
    { data: brands },
  ] = await Promise.all([
    supabase
      .from('page_seo')
      .select('path, updated_at, robots_index')
      .eq('robots_index', true)
      .order('path'),
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

  // Static pages — every indexable row in page_seo, with admin-edited
  // `updated_at` driving lastModified.
  const staticPages: MetadataRoute.Sitemap = (pageRows ?? []).map((p) => {
    const tuning = STATIC_TUNING[p.path] ?? STATIC_DEFAULT;
    return {
      url: `${base}${p.path === '/' ? '/' : p.path}`,
      lastModified: new Date(p.updated_at),
      changeFrequency: tuning.changeFrequency,
      priority: tuning.priority,
    };
  });

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
