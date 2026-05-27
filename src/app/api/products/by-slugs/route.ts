import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_SLUGS = 50;

/**
 * GET /api/products/by-slugs?slugs=a,b,c
 *
 * Returns active products matching the given slugs, **in the order the
 * caller asked for**. Used by `<RecentlyViewedStrip>` (which orders by recency
 * in localStorage) and by `<WishlistView>` (which orders by add-time).
 *
 * Public — RLS limits responses to `is_active = true` rows.
 *
 * The slug list is capped at MAX_SLUGS to keep response sizes bounded; the
 * recently-viewed store already caps at 10 and the wishlist is bounded by
 * what the user opts into, so MAX_SLUGS=50 is plenty of headroom.
 */
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('slugs') ?? '';
  const slugs = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_SLUGS);

  if (slugs.length === 0) {
    return NextResponse.json({ products: [] });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .in('slug', slugs);

  if (error) {
    return NextResponse.json({ error: error.message, products: [] }, { status: 500 });
  }

  // Preserve caller-supplied ordering.
  const bySlug = new Map((data ?? []).map((p) => [p.slug, p]));
  const ordered = slugs.map((s) => bySlug.get(s)).filter((p) => p != null);

  return NextResponse.json(
    { products: ordered },
    {
      // Cheap: a few rows per call, no per-user data, safe to cache briefly.
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
    },
  );
}
