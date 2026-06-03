/**
 * Canonical list of admin panel sections — the single source of truth for the
 * sidebar nav, the per-page access guard (`requirePageAccess`), and the Team
 * management UI. Each `key` is the stable permission identifier stored in
 * `public.admin_user_pages.page_key`.
 *
 * Rules baked into the model:
 *  - `dashboard` is always allowed for any admin so nobody lands on a blocked
 *    home page; it is not grantable (and not revocable).
 *  - `superAdminOnly` pages (Team) are visible/usable only to full-access users
 *    (super_admin or env-bootstrap) and are never grantable.
 *  - CSV Import (`/admin/products/import`) deliberately has no key of its own —
 *    it resolves to `products` since it is a product action, not a section.
 */
export type AdminPage = {
  /** Stable permission key stored in admin_user_pages.page_key. */
  key: string;
  label: string;
  href: string;
  icon: string;
  /** Owner-only section — never granted to regular admins. */
  superAdminOnly?: boolean;
};

export const ADMIN_PAGES: AdminPage[] = [
  { key: 'dashboard', label: 'Dashboard', href: '/admin', icon: '📊' },
  { key: 'orders', label: 'Orders', href: '/admin/orders', icon: '🧾' },
  { key: 'customers', label: 'Customers', href: '/admin/customers', icon: '👥' },
  { key: 'products', label: 'Products', href: '/admin/products', icon: '📦' },
  { key: 'products', label: 'CSV Import', href: '/admin/products/import', icon: '⬆️' },
  { key: 'promotions', label: 'Promotions', href: '/admin/promotions', icon: '🎯' },
  { key: 'discounts', label: 'Discounts', href: '/admin/discounts', icon: '🎟️' },
  { key: 'pages', label: 'Pages', href: '/admin/pages', icon: '📄' },
  { key: 'categories', label: 'Categories', href: '/admin/categories', icon: '🗂' },
  { key: 'brands', label: 'Brands', href: '/admin/brands', icon: '🏷' },
  { key: 'payment-methods', label: 'Payment methods', href: '/admin/payment-methods', icon: '💳' },
  { key: 'chatbot', label: 'Chatbot FAQs', href: '/admin/chatbot', icon: '🤖' },
  { key: 'settings', label: 'Store settings', href: '/admin/settings', icon: '⚙️' },
  { key: 'team', label: 'Team', href: '/admin/team', icon: '🔐', superAdminOnly: true },
];

/** The dashboard key is granted implicitly to every admin. */
export const DASHBOARD_KEY = 'dashboard';

/**
 * Pages a super_admin can grant to a regular admin — excludes the always-on
 * dashboard and owner-only sections. De-duplicated by key (CSV Import shares
 * the `products` key).
 */
export const GRANTABLE_PAGES: AdminPage[] = ADMIN_PAGES.filter(
  (p, i, arr) =>
    !p.superAdminOnly &&
    p.key !== DASHBOARD_KEY &&
    arr.findIndex((q) => q.key === p.key) === i,
);

/** Every key that exists, for validating incoming grant payloads. */
export const GRANTABLE_KEYS = new Set(GRANTABLE_PAGES.map((p) => p.key));

/** Quick lookup of whether a key names a super_admin-only section. */
export function isSuperAdminOnlyKey(key: string): boolean {
  return ADMIN_PAGES.some((p) => p.key === key && p.superAdminOnly);
}

/**
 * Maps a request path to its permission key. Matches the most specific (longest)
 * href first so `/admin/products/import` resolves to `products` and the
 * `/admin` dashboard entry doesn't swallow every nested route. Returns null for
 * paths outside the registry (e.g. /admin/login).
 */
export function resolvePageKey(pathname: string): string | null {
  const candidates = ADMIN_PAGES.filter(
    (p) => pathname === p.href || pathname.startsWith(`${p.href}/`),
  ).sort((a, b) => b.href.length - a.href.length);
  return candidates[0]?.key ?? null;
}
