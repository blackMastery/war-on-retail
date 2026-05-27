/**
 * Catalogue-wide rules that aren't per-product (those live in the DB).
 *
 * "New arrival" window:
 *   A product is considered a new arrival if its `created_at` is within
 *   NEW_ARRIVAL_WINDOW_DAYS days of now. The badge on `<ProductCard>` and the
 *   "Just Arrived" strip on the homepage both honour this.
 *
 *   Tune via the `NEW_ARRIVAL_DAYS` env var (defaults to 30). Reasonable
 *   values: 14 (fast turnover), 30 (typical), 60–90 (slower-moving catalogues).
 *
 *   The badge auto-expires — there's no flag to flip on the row. The moment
 *   `created_at` falls outside the window, the badge stops rendering on the
 *   next page load.
 */

const FALLBACK_DAYS = 30;
const MIN_DAYS = 1;
const MAX_DAYS = 365;

function parseWindowDays(raw: string | undefined): number {
  if (!raw) return FALLBACK_DAYS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < MIN_DAYS || n > MAX_DAYS) return FALLBACK_DAYS;
  return n;
}

export const NEW_ARRIVAL_WINDOW_DAYS = parseWindowDays(process.env.NEW_ARRIVAL_DAYS);

/** True when a product's `created_at` is within the new-arrival window. */
export function isNewArrival(createdAt: string | Date | null | undefined): boolean {
  if (!createdAt) return false;
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  if (!Number.isFinite(created.getTime())) return false;
  const ageMs = Date.now() - created.getTime();
  return ageMs >= 0 && ageMs < NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

/**
 * ISO timestamp representing the start of the new-arrival window. Use this
 * server-side in Supabase queries:
 *
 *   .gte('created_at', newArrivalCutoffIso())
 */
export function newArrivalCutoffIso(): string {
  return new Date(Date.now() - NEW_ARRIVAL_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
}
