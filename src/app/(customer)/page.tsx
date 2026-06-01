import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getStoreSettings, type ResolvedStoreSettings } from '@/lib/store-settings';
import CategoryCard from '@/components/customer/CategoryCard';
import BrandCard from '@/components/customer/BrandCard';
import HorizontalScroller from '@/components/customer/HorizontalScroller';
import ProductCard from '@/components/customer/ProductCard';
import ProductGrid from '@/components/customer/ProductGrid';
import PromotionMosaic from '@/components/customer/PromotionMosaic';
import RecentlyViewedStrip from '@/components/customer/RecentlyViewedStrip';
import { NEW_ARRIVAL_WINDOW_DAYS, newArrivalCutoffIso } from '@/config/catalog';
import { getPageSeo } from '@/lib/page-seo';

// Short revalidate so newly-scheduled promotions appear within a minute.
export const revalidate = 60;

// Compile-time keyword defaults — tuned for the keywords a Guyanese shopper
// actually types. The admin can override any of these via /admin/pages → Home.
const HOME_KEYWORDS_DEFAULT = [
  'electronics Guyana',
  'home appliances Guyana',
  'TVs Georgetown',
  'fridges Guyana',
  'washing machines Guyana',
  'computers Guyana',
  'kitchen appliances Guyana',
  'personal care electronics',
  'War on Retail',
];
const HOME_DESCRIPTION_DEFAULT =
  'Shop TVs, fridges, washing machines, computers, and personal-care electronics in Guyana. Authentic products, manufacturer warranties, fast delivery in Georgetown and nationwide. Buy via WhatsApp or browse online.';

export async function generateMetadata(): Promise<Metadata> {
  const [seo, settings] = await Promise.all([getPageSeo('home'), getStoreSettings()]);
  // Defaults compose admin-edited store name with a tuned-for-Guyana phrase.
  const titleDefault = `${settings.name} — Electronics & Home Appliances in Guyana`;
  const title = seo?.meta_title?.trim() || titleDefault;
  const description = seo?.meta_description?.trim() || HOME_DESCRIPTION_DEFAULT;
  const keywords = seo?.meta_keywords
    ? seo.meta_keywords.split(',').map((s) => s.trim()).filter(Boolean)
    : HOME_KEYWORDS_DEFAULT;
  const indexable = seo?.robots_index ?? true;

  return {
    // `absolute` so the root template doesn't append the brand twice — the
    // brand is already part of the lead phrase.
    title: { absolute: title },
    description,
    alternates: { canonical: '/' },
    keywords,
    robots: indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
          },
        }
      : { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: settings.url,
      type: 'website',
      siteName: settings.name,
      locale: 'en_GY',
      images: [{ url: '/logo.png', alt: settings.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/logo.png'],
    },
  };
}

/**
 * Organization + WebSite JSON-LD.
 *
 * - `Organization` declares the business identity for the Knowledge Panel —
 *   name, logo, social profiles, contact channel, address. Google reads
 *   `sameAs` to consolidate identity across Facebook/Instagram/Twitter.
 * - `WebSite` with a `SearchAction` tells Google the URL pattern for the
 *   in-site search. This is the trigger for the sitelinks search box that
 *   appears on branded SERPs (e.g. searching "war on retail" shows a search
 *   field below the result).
 */
function buildHomeJsonLd(settings: ResolvedStoreSettings) {
  const base = settings.url.replace(/\/+$/, '');
  // sameAs accepts only present social profiles — admin can clear any of the
  // three URLs to hide them from the footer + remove them here.
  const sameAs = [
    settings.social.facebook,
    settings.social.instagram,
    settings.social.twitter,
  ].filter((u): u is string => !!u);
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name: settings.name,
    url: base,
    logo: `${base}/logo.png`,
    description: settings.description,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressCountry: 'GY',
    },
    contactPoint: [
      {
        '@type': 'ContactPoint',
        telephone: `+${settings.whatsapp}`,
        contactType: 'customer service',
        areaServed: 'GY',
        availableLanguage: ['English'],
      },
    ],
    ...(sameAs.length ? { sameAs } : {}),
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    url: base,
    name: settings.name,
    description: settings.description,
    publisher: { '@id': `${base}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${base}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  return { '@context': 'https://schema.org', '@graph': [organization, website] };
}

export default async function Homepage() {
  const [supabase, settings] = await Promise.all([
    createClient(),
    getStoreSettings(),
  ]);
  const nowIso = new Date().toISOString();

  // Active promotions in-window. RLS already filters this, but we mirror the
  // predicate so the type stays narrow and we control sort.
  const promotionsQuery = supabase
    .from('promotions')
    .select('*')
    .eq('is_active', true)
    .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('is_featured', { ascending: false })
    .order('display_order')
    .limit(5);

  const [
    { data: featured },
    { data: categories },
    { data: brands },
    { data: promotions },
    { data: newArrivals },
  ] = await Promise.all([
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .is('parent_id', null)
      .order('display_order'),
    // Bumped from 12 — horizontal scroll handles more items gracefully.
    supabase.from('brands').select('*').eq('is_active', true).order('display_order').limit(24),
    promotionsQuery,
    // New arrivals: products whose created_at is within NEW_ARRIVAL_WINDOW_DAYS.
    // No DB flag — purely date-driven, auto-expires when the row ages out.
    supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .gte('created_at', newArrivalCutoffIso())
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  const hasPromotions = !!promotions && promotions.length > 0;
  const jsonLd = buildHomeJsonLd(settings);

  return (
    <div>
      {/* Organization + WebSite structured data. JSON.stringify is XSS-safe
          here — every input is JSON-encoded, no HTML is interpolated. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Promotion mosaic replaces the hero when any are live. */}
      {hasPromotions ? (
        <PromotionMosaic promotions={promotions} />
      ) : (
        <section className="bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 text-white">
          <div className="container py-16 md:py-24">
            <div className="max-w-2xl">
              <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
                Electronics &amp; Home Appliances, Delivered Across Guyana.
              </h1>
              <p className="mt-4 text-pretty text-lg opacity-95 md:text-xl">
                Authentic products, manufacturer warranties, and real human support — every order.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/categories"
                  className="inline-block rounded-md bg-white px-6 py-3 font-semibold text-primary-700 hover:bg-accent-100"
                >
                  Shop Categories
                </Link>
                <Link
                  href="/deals"
                  className="inline-block rounded-md border-2 border-white px-6 py-3 font-semibold hover:bg-white/10"
                >
                  <span aria-hidden="true">🔥 </span>Today’s Deals
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Categories — horizontal scroller */}
      <section className="container py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <Link href="/categories" className="text-sm font-medium text-primary-600 hover:underline">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <HorizontalScroller ariaLabel="Categories" gap={3}>
          {categories?.map((c) => (
            <div key={c.id} className="w-36 shrink-0 snap-start sm:w-44">
              <CategoryCard category={c} />
            </div>
          ))}
        </HorizontalScroller>
      </section>

      {/* New Arrivals — only shown when something exists in the window. */}
      {newArrivals && newArrivals.length > 0 && (
        <section className="container py-12">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">
                <span aria-hidden="true">✨ </span>Just Arrived
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Fresh stock added in the last {NEW_ARRIVAL_WINDOW_DAYS} days
              </p>
            </div>
            <Link
              href="/products?sort=newest"
              className="shrink-0 text-sm font-medium text-primary-600 hover:underline"
            >
              View all <span aria-hidden="true">→</span>
            </Link>
          </div>
          <HorizontalScroller ariaLabel="New arrivals" gap={4}>
            {newArrivals.map((p) => (
              <div key={p.id} className="flex w-60 shrink-0 snap-start sm:w-64">
                <ProductCard product={p} layout="strip" imageSizes="240px" className="w-full" />
              </div>
            ))}
          </HorizontalScroller>
        </section>
      )}

      {/* Recently viewed — pulls from localStorage; renders nothing for
          first-time visitors. Two-product minimum keeps it from being a
          lonely strip with one tile after the first product view. */}
      <RecentlyViewedStrip title="Recently Viewed" minItems={2} />

      {/* Featured products */}
      <section className="bg-accent-600">
        <div className="container py-12">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold">Featured Products</h2>
            <Link
              href="/products"
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              All products <span aria-hidden="true">→</span>
            </Link>
          </div>
          <ProductGrid products={featured ?? []} />
        </div>
      </section>

      {/* Brands — horizontal scroller */}
      <section className="container py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Popular Brands</h2>
          <Link href="/brands" className="text-sm font-medium text-primary-600 hover:underline">
            View all <span aria-hidden="true">→</span>
          </Link>
        </div>
        <HorizontalScroller ariaLabel="Brands" gap={3}>
          {brands?.map((b) => (
            <div key={b.id} className="w-32 shrink-0 snap-start sm:w-36">
              <BrandCard brand={b} />
            </div>
          ))}
        </HorizontalScroller>
      </section>

      {/* Value props */}
      <section className="container py-12">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { icon: '🚚', title: 'Fast Delivery', body: 'Same-day Georgetown, 2–5 days nationwide.' },
            { icon: '💯', title: 'Authentic', body: 'Direct from manufacturers and authorised dealers.' },
            { icon: '🤝', title: 'Real Support', body: 'Chat with the team on WhatsApp or right here.' },
          ].map((v) => (
            <div
              key={v.title}
              className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              <div className="text-3xl" aria-hidden="true">
                {v.icon}
              </div>
              <h3 className="mt-3 font-bold">{v.title}</h3>
              <p className="mt-1 text-pretty text-sm text-gray-600">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
