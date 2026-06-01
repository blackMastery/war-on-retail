/**
 * Shared building blocks for the product `ilike` search predicate.
 *
 * Used by both the server-rendered `/search` page and the `/api/search/suggest`
 * autocomplete route handler — keeping the helpers here means the dropdown
 * suggestions and the full results page can never drift out of sync over what
 * counts as a "match".
 */

/** Columns the OR-clause checks for `ilike` matches. */
export const SEARCH_FIELDS = [
  'name',
  'short_description',
  'description',
  'sku',
] as const;

/**
 * Escapes the PostgREST `ilike` wildcards (`%`, `_`) and the separator that
 * the `.or(...)` filter uses (`,`). Anything else flows through verbatim so
 * the user can type spaces, hyphens, parens, etc. without confusing the
 * matcher.
 */
export function buildPattern(raw: string): string {
  const safe = raw.replace(/[%_,]/g, '\\$&');
  return `%${safe}%`;
}

/**
 * Convenience: build the comma-joined OR-clause body
 * (e.g. `name.ilike.%tv%,sku.ilike.%tv%`) ready to hand to PostgREST's
 * `.or(...)` builder.
 *
 * `fields` defaults to `SEARCH_FIELDS` (the product-search default), but the
 * admin orders / customers pages pass their own field lists to match against
 * `order_number` / `name` / `phone` etc.
 */
export function buildIlikeOrClause(
  raw: string,
  fields: readonly string[] = SEARCH_FIELDS,
): string {
  const pattern = buildPattern(raw);
  return fields.map((f) => `${f}.ilike.${pattern}`).join(',');
}
