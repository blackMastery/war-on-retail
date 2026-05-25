import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Product } from '@/types/database';

/** Tunables — small enough that the math is easy to reason about. */
const WEIGHT = {
  sameCategory: 10,
  sameBrand: 6,
  // Multiplier on price proximity (0…1).
  priceProximity: 4,
  featuredBonus: 1.5,
  hasImage: 0.5,
} as const;

const CANDIDATE_POOL = 30;
const DEFAULT_LIMIT = 8;

/**
 * Returns products similar to `current`, ordered by descending relevance.
 *
 * Strategy:
 *   1. Build a candidate pool with a single `or(...)` query so we get matches
 *      on EITHER same-category OR same-brand OR a price band ±50%. This casts
 *      a wide-enough net that even an oddly-categorised product gets sensible
 *      neighbours.
 *   2. Score each candidate by weighted signal (category > brand > price
 *      proximity > featured/has-image tiebreakers).
 *   3. Sort and slice to `limit`.
 *
 * If the pool returns nothing (e.g. tiny catalogue, no overlapping
 * dimensions), fall back to "popular" — featured-first, newest-second —
 * so the section is never empty when other products exist.
 */
export async function fetchRelatedProducts(
  sb: SupabaseClient<Database>,
  current: Product,
  opts: { limit?: number } = {},
): Promise<Product[]> {
  const limit = opts.limit ?? DEFAULT_LIMIT;

  const candidates = await fetchCandidatePool(sb, current);

  if (candidates.length === 0) {
    return fetchPopularFallback(sb, current.id, limit);
  }

  const scored = candidates.map((p) => ({ p, score: scoreProduct(p, current) }));
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit).map((s) => s.p);

  // If the pool came back thinner than `limit`, top it up with popular items.
  if (top.length < limit) {
    const excludeIds = new Set([current.id, ...top.map((p) => p.id)]);
    const filler = await fetchPopularFallback(sb, current.id, limit - top.length, excludeIds);
    top.push(...filler);
  }

  return top;
}

/**
 * Returns up to `limit` *other* products from the same brand as `current`.
 * Used to power the optional "More from {brand}" strip — kept distinct from
 * the mixed-score row so the user gets variety.
 */
export async function fetchMoreFromBrand(
  sb: SupabaseClient<Database>,
  current: Product,
  opts: { limit?: number } = {},
): Promise<Product[]> {
  const limit = opts.limit ?? 4;
  if (!current.brand_id) return [];

  const { data } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .eq('brand_id', current.brand_id)
    .neq('id', current.id)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as Product[];
}

// ---------- internals ----------

async function fetchCandidatePool(
  sb: SupabaseClient<Database>,
  current: Product,
): Promise<Product[]> {
  const filters: string[] = [];
  if (current.category_id) filters.push(`category_id.eq.${current.category_id}`);
  if (current.brand_id) filters.push(`brand_id.eq.${current.brand_id}`);

  // Price band ±50% — catches "similar value" items even when category/brand differ.
  const priceMin = Math.max(0, current.price * 0.5);
  const priceMax = current.price * 1.5;
  filters.push(`and(price.gte.${priceMin},price.lte.${priceMax})`);

  let q = sb.from('products').select('*').eq('is_active', true).neq('id', current.id);
  if (filters.length) q = q.or(filters.join(','));

  const { data } = await q.limit(CANDIDATE_POOL);
  return (data ?? []) as Product[];
}

async function fetchPopularFallback(
  sb: SupabaseClient<Database>,
  excludeId: string,
  limit: number,
  excludeIds?: Set<string>,
): Promise<Product[]> {
  // Over-fetch so we can filter out the current product + anything already picked.
  const { data } = await sb
    .from('products')
    .select('*')
    .eq('is_active', true)
    .neq('id', excludeId)
    .order('is_featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit + (excludeIds?.size ?? 0));

  const rows = (data ?? []) as Product[];
  if (!excludeIds) return rows.slice(0, limit);
  return rows.filter((p) => !excludeIds.has(p.id)).slice(0, limit);
}

function scoreProduct(candidate: Product, current: Product): number {
  let score = 0;

  if (current.category_id && candidate.category_id === current.category_id) {
    score += WEIGHT.sameCategory;
  }
  if (current.brand_id && candidate.brand_id === current.brand_id) {
    score += WEIGHT.sameBrand;
  }

  // Price proximity ∈ [0, 1]. 1 = same price, decays linearly to 0 at 2× away.
  const proximity = priceProximity(candidate.price, current.price);
  score += proximity * WEIGHT.priceProximity;

  if (candidate.is_featured) score += WEIGHT.featuredBonus;
  if (candidate.featured_image_url) score += WEIGHT.hasImage;

  return score;
}

function priceProximity(a: number, b: number): number {
  if (a <= 0 || b <= 0) return 0;
  const ratio = Math.min(a, b) / Math.max(a, b); // 1 when equal, → 0 when far
  // Square it so very-near prices count for more than middling-near.
  return ratio * ratio;
}
