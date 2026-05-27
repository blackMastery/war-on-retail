import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import CategoryCard from '@/components/customer/CategoryCard';
import BrandCard from '@/components/customer/BrandCard';
import HorizontalScroller from '@/components/customer/HorizontalScroller';
import ProductCard from '@/components/customer/ProductCard';
import ProductGrid from '@/components/customer/ProductGrid';
import PromotionMosaic from '@/components/customer/PromotionMosaic';
import RecentlyViewedStrip from '@/components/customer/RecentlyViewedStrip';
import { NEW_ARRIVAL_WINDOW_DAYS, newArrivalCutoffIso } from '@/config/catalog';

// Short revalidate so newly-scheduled promotions appear within a minute.
export const revalidate = 60;

export default async function Homepage() {
  const supabase = await createClient();
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

  return (
    <div>
      {/* Promotion mosaic replaces the hero when any are live. */}
      {hasPromotions ? (
        <PromotionMosaic promotions={promotions} />
      ) : (
        <section className="bg-gradient-to-r from-primary-700 to-primary-500 text-white">
          <div className="container py-16 md:py-24">
            <div className="max-w-2xl">
              <h1 className="text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
                Electronics &amp; Home Appliances, Delivered Across Guyana.
              </h1>
              <p className="mt-4 text-pretty text-lg opacity-95 md:text-xl">
                Authentic products, manufacturer warranties, and real human support — every order.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/categories"
                  className="inline-block rounded-md bg-white px-6 py-3 font-semibold text-primary-700 hover:bg-gray-100"
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
              <div key={p.id} className="w-60 shrink-0 snap-start sm:w-64">
                <ProductCard product={p} />
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
      <section className="bg-gray-100">
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
