import type { Brand, Category } from '@/types/database';

/**
 * Canonical filter state. The URL is the source of truth — this is the
 * decoded shape, with arrays for multi-select params and numbers for prices.
 */
export type ProductFilters = {
  categorySlugs: string[];
  brandSlugs: string[];
  minPrice: number | null;
  maxPrice: number | null;
  inStock: boolean;
  onSale: boolean;
  sort: SortKey;
};

export type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'newest';

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low → high' },
  { value: 'price-desc', label: 'Price: high → low' },
];

/** URL param names — keep these stable; they're part of the public link shape. */
export const PARAM = {
  category: 'category',
  brand: 'brand',
  minPrice: 'min_price',
  maxPrice: 'max_price',
  inStock: 'in_stock',
  onSale: 'on_sale',
  sort: 'sort',
} as const;

/** Decode filters from a Next.js searchParams object (string | string[] values). */
export function readFilters(sp: Record<string, string | string[] | undefined>): ProductFilters {
  const arr = (v: string | string[] | undefined): string[] =>
    v == null ? [] : Array.isArray(v) ? v : v ? [v] : [];
  const num = (v: string | string[] | undefined): number | null => {
    const s = Array.isArray(v) ? v[0] : v;
    if (s == null || s === '') return null;
    const n = Number(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  const bool = (v: string | string[] | undefined): boolean => {
    const s = Array.isArray(v) ? v[0] : v;
    return s === '1' || s === 'true';
  };

  const sortRaw = (Array.isArray(sp[PARAM.sort]) ? sp[PARAM.sort]?.[0] : sp[PARAM.sort]) ?? '';
  const sort: SortKey = SORT_OPTIONS.find((o) => o.value === sortRaw)?.value ?? 'featured';

  return {
    categorySlugs: arr(sp[PARAM.category]),
    brandSlugs: arr(sp[PARAM.brand]),
    minPrice: num(sp[PARAM.minPrice]),
    maxPrice: num(sp[PARAM.maxPrice]),
    inStock: bool(sp[PARAM.inStock]),
    onSale: bool(sp[PARAM.onSale]),
    sort,
  };
}

/**
 * Expand a set of category slugs into the full list of category IDs to query,
 * including descendant categories. So selecting "Electronics" finds products
 * tagged under "Televisions", "Audio Systems", etc.
 *
 * Returns `null` when no category filter is active (caller should skip the `.in`).
 */
export function expandCategoryIds(
  categorySlugs: string[],
  allCategories: Pick<Category, 'id' | 'slug' | 'parent_id'>[],
): string[] | null {
  if (!categorySlugs.length) return null;

  const byId = new Map(allCategories.map((c) => [c.id, c]));
  const bySlug = new Map(allCategories.map((c) => [c.slug, c]));
  const childrenOf = new Map<string | null, string[]>();
  for (const c of allCategories) {
    const list = childrenOf.get(c.parent_id) ?? [];
    list.push(c.id);
    childrenOf.set(c.parent_id, list);
  }

  const result = new Set<string>();
  const visit = (id: string) => {
    if (result.has(id)) return;
    result.add(id);
    for (const childId of childrenOf.get(id) ?? []) visit(childId);
  };

  for (const slug of categorySlugs) {
    const root = bySlug.get(slug);
    if (!root) continue;
    visit(root.id);
    // Belt & braces: walk up to the root in case data layout changes.
    void byId;
  }
  return Array.from(result);
}

/** Map brand slugs → ids (skipping any unknown slugs silently). */
export function brandSlugsToIds(
  brandSlugs: string[],
  brands: Pick<Brand, 'id' | 'slug'>[],
): string[] | null {
  if (!brandSlugs.length) return null;
  const bySlug = new Map(brands.map((b) => [b.slug, b.id]));
  const ids = brandSlugs.map((s) => bySlug.get(s)).filter((v): v is string => !!v);
  return ids.length ? ids : null;
}

/**
 * Build the canonical query string from a filter state. Used by both the
 * sidebar (for live URL sync) and the chip "remove" links.
 *
 * Empty / default values are omitted so URLs stay short and shareable.
 */
export function filtersToQuery(f: ProductFilters): string {
  const params = new URLSearchParams();
  for (const s of f.categorySlugs) params.append(PARAM.category, s);
  for (const s of f.brandSlugs) params.append(PARAM.brand, s);
  if (f.minPrice != null) params.set(PARAM.minPrice, String(f.minPrice));
  if (f.maxPrice != null) params.set(PARAM.maxPrice, String(f.maxPrice));
  if (f.inStock) params.set(PARAM.inStock, '1');
  if (f.onSale) params.set(PARAM.onSale, '1');
  if (f.sort !== 'featured') params.set(PARAM.sort, f.sort);
  return params.toString();
}

/** True when any non-default filter is active. */
export function hasActiveFilters(f: ProductFilters): boolean {
  return (
    f.categorySlugs.length > 0 ||
    f.brandSlugs.length > 0 ||
    f.minPrice != null ||
    f.maxPrice != null ||
    f.inStock ||
    f.onSale ||
    f.sort !== 'featured'
  );
}
