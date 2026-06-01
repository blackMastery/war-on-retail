import 'server-only';
import { cache } from 'react';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { getStoreSettings } from '@/lib/store-settings';
import type { PageSeo } from '@/types/database';

/**
 * Loads the singleton SEO row for a given static-page id (e.g. `'about'`).
 * Wrapped in React's `cache()` so the layout, the page, and `generateMetadata`
 * can all call it within one request and share a single Supabase round-trip.
 */
export const getPageSeo = cache(async (id: string): Promise<PageSeo | null> => {
  const sb = await createClient();
  const { data } = await sb
    .from('page_seo')
    .select('*')
    .eq('id', id)
    .maybeSingle<PageSeo>();
  return data;
});

/** Comma-separated `meta_keywords` → trimmed string array suitable for Next's Metadata. */
function parseKeywords(raw: string | null | undefined): string[] | undefined {
  if (!raw) return undefined;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? list : undefined;
}

/**
 * Composes a Next `Metadata` for a static customer page.
 *
 * Resolution order:
 *   - title:        admin override → caller default → store name
 *   - description:  admin override → caller default → store description
 *   - keywords:     admin override only (no defaults — empty list omits the tag)
 *   - robots:       admin override (defaults to indexable for unknown ids)
 *
 * Caller hands in sensible compile-time defaults so the page still renders
 * correct metadata before the migration is applied or when the row is absent.
 */
export async function pageMetadata(
  id: string,
  defaults: { title: string; description?: string },
): Promise<Metadata> {
  const [seo, site] = await Promise.all([getPageSeo(id), getStoreSettings()]);

  const title = seo?.meta_title?.trim() || defaults.title;
  const description =
    seo?.meta_description?.trim() || defaults.description || site.description;
  const keywords = parseKeywords(seo?.meta_keywords);
  const indexable = seo?.robots_index ?? true;

  return {
    title,
    description,
    keywords,
    robots: indexable
      ? { index: true, follow: true }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  };
}
