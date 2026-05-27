import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

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
 */
export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/+$/, '');
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
