/**
 * Single source of truth for the slug-keyed emoji fallback used whenever a
 * category lacks a real `image_url`.
 *
 * Used by:
 *   - `<CategoryCard>` on the homepage horizontal scroller and /categories list
 *   - The mobile menu in `<Header>` for top-level and featured category rows
 *
 * Pinning these in one place means the icon a shopper sees on the homepage
 * matches the icon they see in the drawer — important for visual continuity
 * on a brand-new visit when the mental model is still forming.
 *
 * Slugs not in the map fall back to 📦 (generic box) — intentionally bland so
 * it's obvious the admin should upload a real image for that category.
 */
export const CATEGORY_ICONS: Record<string, string> = {
  electronics: '📺',
  'home-appliances': '🧊',
  'kitchen-appliances': '🍳',
  'personal-care': '💈',
  computing: '💻',
};

export function categoryIconFor(slug: string): string {
  return CATEGORY_ICONS[slug] ?? '📦';
}
