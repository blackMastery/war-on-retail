import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { buildIlikeOrClause } from '@/lib/products/search';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 12;
const MIN_QUERY_LEN = 2;

/**
 * GET /api/search/suggest?q=<term>&limit=<n>
 *
 * Live autocomplete backend for the header `<SearchBar>`. Returns a small
 * `{ products: [...] }` payload with just the fields the dropdown needs
 * (id, slug, name, featured_image_url, price, compare_at_price) — narrower
 * than `select('*')` so the response is small and fast.
 *
 * Public — RLS limits responses to `is_active = true` rows. The same OR
 * predicate runs on the `/search` page so the dropdown and the full results
 * page agree on what counts as a match.
 *
 * Caching: 30 s public + s-maxage. Catalogue is small and rarely changes;
 * repeat keystrokes within a typing session hit the cache, which keeps
 * Supabase quiet.
 */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim();
  const rawLimit = Number(req.nextUrl.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(MAX_LIMIT, Math.max(1, Math.floor(rawLimit)))
    : DEFAULT_LIMIT;

  // Skip the DB round-trip for queries that are too short to be useful.
  // Two characters keeps the noise down without feeling stingy.
  if (q.length < MIN_QUERY_LEN) {
    return NextResponse.json({ products: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('id, slug, name, featured_image_url, price, compare_at_price')
    .eq('is_active', true)
    .or(buildIlikeOrClause(q))
    // Mirror the `/search` page's ordering so the dropdown's top result is
    // also the top result on the full page — no jarring reorder on submit.
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message, products: [] }, { status: 500 });
  }

  return NextResponse.json(
    { products: data ?? [] },
    {
      // Cheap: ~8 rows, no per-user data, safe to cache briefly across
      // CDN + browser.
      headers: { 'Cache-Control': 'public, max-age=30, s-maxage=30' },
    },
  );
}
