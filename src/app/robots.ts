import type { MetadataRoute } from 'next';
import { getStoreSettings } from '@/lib/store-settings';

/**
 * Crawl rules.
 *
 * Allow everything except:
 *   - `/admin/*` — staff-only routes, never indexable
 *   - `/api/*`   — server routes, no HTML to index
 *   - `/cart`    — per-visitor localStorage state
 *
 * Notable choices:
 *   - We do NOT disallow `/search` — Google can crawl the empty search page,
 *     but with no `q` it has no content to index, so it self-deprioritises.
 *     Blocking it would also block legitimate inbound links to result pages.
 *   - We allow filtered/paginated product URLs (`/products?category=…`,
 *     `?page=2`). They're canonical via the URL itself; if duplicate-content
 *     concerns ever come up we'd add a `<link rel="canonical">` to the base
 *     `/products` instead of disallowing.
 *
 * The `host` and the sitemap URL both come from the admin-edited canonical
 * URL (`store_settings.url`), so changing it in `/admin/settings` propagates
 * to robots.txt automatically.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getStoreSettings();
  const base = settings.url.replace(/\/+$/, '');
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/admin', '/api/', '/cart'],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
