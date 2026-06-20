import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { getStoreSettings } from '@/lib/store-settings';
import AddToCartButton from '@/components/customer/AddToCartButton';
import ProductCard from '@/components/customer/ProductCard';
import ProductGallery from '@/components/customer/ProductGallery';
import RecentlyViewedStrip from '@/components/customer/RecentlyViewedStrip';
import RecentlyViewedTracker from '@/components/customer/RecentlyViewedTracker';
import WishlistButton from '@/components/customer/WishlistButton';
import { fetchMoreFromBrand, fetchRelatedProducts } from '@/lib/products/recommendations';
import { buildProductJsonLd } from '@/lib/products/structured-data';
import { productAvailability } from '@/lib/products/availability';

export const revalidate = 60;

/**
 * Truncate at a word boundary so meta-description previews don't end mid-word.
 * Google typically renders 155–160 chars; 200 leaves headroom for social
 * previews (OG/Twitter) which truncate higher, while still being safe.
 */
function truncateAtWord(input: string, max = 200): string {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  const slice = trimmed.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 0 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

/** Avoid "Samsung Samsung …" when the product name already starts with the brand. */
function titleWithBrand(brandName: string, productName: string): string {
  const name = productName.trim();
  if (name.toLowerCase().startsWith(brandName.toLowerCase())) return name;
  return `${brandName} ${name}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [supabase, settings] = await Promise.all([createClient(), getStoreSettings()]);

  const { data: product } = await supabase
    .from('products')
    .select(
      'name, slug, short_description, description, meta_title, meta_description, meta_keywords, featured_image_url, image_urls, price, compare_at_price, stock_quantity, track_inventory, is_pre_order_enabled, is_active, brand_id, sku',
    )
    .eq('slug', slug)
    .maybeSingle();

  // Unknown product → tell crawlers explicitly not to index the 404. Without
  // this, a deleted-then-re-crawled URL can linger as a soft-404 in Search
  // Console reports.
  if (!product || !product.is_active) {
    return {
      title: 'Product not found',
      robots: { index: false, follow: false },
    };
  }

  // Brand name (one extra round-trip but it keeps the metadata description
  // and OG title brand-prefixed, which matters for SERP CTR on brand-driven
  // searches like "Samsung 55 inch TV Guyana").
  const { data: brand } = product.brand_id
    ? await supabase
        .from('brands')
        .select('name')
        .eq('id', product.brand_id)
        .maybeSingle()
    : { data: null };

  const canonicalPath = `/products/${product.slug}`;
  const canonical = `${settings.url.replace(/\/+$/, '')}${canonicalPath}`;

  // Title — prefer admin-set meta_title, fall back to "{Brand} {Name}".
  // The root layout's title template appends " · War on Retail" automatically.
  const title =
    product.meta_title ??
    (brand?.name ? titleWithBrand(brand.name, product.name) : product.name);

  // Description fallback ladder. Each step is intentional:
  //  1. meta_description — explicit marketing copy
  //  2. short_description — the promo blurb on the card
  //  3. truncated long description — better than nothing
  //  4. generated fallback — formula combining brand + price + trust signals,
  //     because an empty meta description is worse than a templated one for
  //     SERPs and social previews.
  const generatedDescription = (() => {
    if (product.meta_description) return product.meta_description;
    if (product.short_description) return product.short_description;
    if (product.description) return product.description;
    const lead = brand?.name
      ? `Buy the ${titleWithBrand(brand.name, product.name)}`
      : `Buy ${product.name}`;
    return `${lead} for ${formatPrice(product.price)} at ${settings.name}. Authentic products, manufacturer warranty, delivery across Guyana.`;
  })();
  const description = truncateAtWord(generatedDescription, 200);

  // OG/Twitter image. Prefer the featured image; fall back to the first
  // gallery image; finally fall back to the site logo (set in app/layout.tsx).
  const ogImageUrl =
    product.featured_image_url ?? product.image_urls?.[0] ?? '/logo.png';
  const ogImageAlt = brand?.name
    ? titleWithBrand(brand.name, product.name)
    : product.name;

  // Three-way availability classification — drives the structured-data
  // `availability` meta tag below. `preorder` is the Facebook/Pinterest
  // product-pin enum that signals "buyable now, ships later".
  const metaAvailability = productAvailability({
    track_inventory: product.track_inventory,
    stock_quantity: product.stock_quantity,
    is_pre_order_enabled: product.is_pre_order_enabled,
  });
  const price = typeof product.price === 'string' ? Number(product.price) : product.price;

  // Admin-set keywords are comma-separated. Anything else → undefined so Next
  // omits the meta tag rather than emitting an empty list.
  const keywords = product.meta_keywords
    ? product.meta_keywords.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: canonicalPath },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      siteName: settings.name,
      locale: 'en_GY',
      images: [{ url: ogImageUrl, alt: ogImageAlt }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
    // Facebook/Pinterest product-pin meta tags. Next.js exposes arbitrary
    // <meta> via the `other` field. These are namespaced strings, not
    // OpenGraph proper, so they live here.
    other: {
      'product:price:amount': price.toFixed(2),
      'product:price:currency': 'GYD',
      'product:availability':
        metaAvailability === 'pre-order'
          ? 'preorder'
          : metaAvailability === 'out-of-stock'
            ? 'out of stock'
            : 'in stock',
      'product:condition': 'new',
      ...(product.sku ? { 'product:retailer_item_id': product.sku } : {}),
      ...(brand?.name ? { 'product:brand': brand.name } : {}),
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [supabase, settings] = await Promise.all([createClient(), getStoreSettings()]);

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (!product) notFound();

  const [{ data: category }, { data: brand }] = await Promise.all([
    product.category_id
      ? supabase.from('categories').select('*').eq('id', product.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    product.brand_id
      ? supabase.from('brands').select('*').eq('id', product.brand_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const discount = calculateDiscount(product.price, product.compare_at_price);
  // Compose the per-image metadata lookup the gallery needs. The featured
  // image's alt lives on its own column (so the customer detail page can pre-
  // render it without fishing through the JSON), but we mirror it into
  // `image_meta` so the gallery can do a uniform URL-keyed lookup.
  const galleryImageMeta: Record<string, import('@/types/database').ProductImageMeta> = {
    ...(product.image_meta ?? {}),
    ...(product.featured_image_url
      ? {
          [product.featured_image_url]: {
            alt:
              product.image_meta?.[product.featured_image_url]?.alt ??
              product.featured_image_alt ??
              null,
            caption:
              product.image_meta?.[product.featured_image_url]?.caption ?? null,
            keywords:
              product.image_meta?.[product.featured_image_url]?.keywords ?? null,
          },
        }
      : {}),
  };
  const allImages = [product.featured_image_url, ...(product.image_urls ?? [])].filter(
    Boolean,
  ) as string[];
  const availability = productAvailability(product);
  const isOutOfStock = availability === 'out-of-stock';
  const isPreOrder = availability === 'pre-order';
  const specs = (product.specifications ?? {}) as Record<string, unknown>;

  // Recommendations: a mixed-signal "You may also like" row plus an optional
  // "More from {brand}" strip when the brand has at least 3 other items.
  // Both queries run in parallel; we de-duplicate after the fact so the user
  // never sees the same product in both rows.
  const [related, brandMore] = await Promise.all([
    fetchRelatedProducts(supabase, product, { limit: 8 }),
    fetchMoreFromBrand(supabase, product, { limit: 6 }),
  ]);
  const relatedIds = new Set(related.map((p) => p.id));
  const brandMoreDeduped = brandMore.filter((p) => !relatedIds.has(p.id)).slice(0, 4);

  const inquiryMessage = encodeURIComponent(
    `Hi War on Retail, I'm interested in "${product.name}" (SKU ${product.sku ?? 'n/a'}).`,
  );

  // Schema.org Product structured data — fed to Google's rich-result parser.
  const jsonLd = buildProductJsonLd({
    product,
    brand,
    images: allImages,
    storeInfo: { name: settings.name, url: settings.url },
  });

  return (
    <div className="container py-8">
      <script
        type="application/ld+json"
        // JSON.stringify here is XSS-safe — all inputs go through JSON-encoding;
        // there's no HTML interpolated into the script body.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Headless: record this view in the customer's recently-viewed list. */}
      <RecentlyViewedTracker slug={product.slug} />

      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-link">
          Home
        </Link>{' '}
        /{' '}
        {category && (
          <>
            <Link
              href={`/categories/${category.slug}`}
              className="hover:text-link"
            >
              {category.name}
            </Link>{' '}
            /{' '}
          </>
        )}
        <span className="text-secondary-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <ProductGallery
          images={allImages}
          productName={product.name}
          discount={discount}
          imageMeta={galleryImageMeta}
        />

        {/* Detail */}
        <div>
          {brand && (
            <Link
              href={`/brands/${brand.slug}`}
              className="text-sm font-medium uppercase tracking-wide text-link hover:underline"
            >
              {brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-pretty text-2xl font-bold text-foreground sm:text-3xl">{product.name}</h1>
          {product.sku && <p className="mt-1 text-xs text-muted-foreground">SKU: {product.sku}</p>}

          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
              {formatPrice(product.price)}
            </span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <del className="text-lg text-muted-foreground line-through">
                <span className="sr-only">Original price: </span>
                {formatPrice(product.compare_at_price)}
              </del>
            )}
          </div>

          {product.short_description && (
            <p className="mt-4 text-secondary-foreground">{product.short_description}</p>
          )}

          <div
            className={`mt-6 rounded-md bg-card p-4 ring-1 ring-border ${
              isPreOrder ? 'ring-blue-200' : ''
            }`}
          >
            {isPreOrder ? (
              <div className="space-y-1 text-sm">
                <p className="font-semibold text-blue-800">
                  Pre-order — ships once restocked
                </p>
                {product.pre_order_message ? (
                  <p className="text-blue-900">{product.pre_order_message}</p>
                ) : (
                  <p className="text-blue-900">
                    Our team will confirm the expected ship date by phone
                    after you place the order.
                  </p>
                )}
              </div>
            ) : isOutOfStock ? (
              <p className="font-semibold text-destructive">Currently out of stock</p>
            ) : (
              <p className="text-sm text-card-foreground">
                {product.track_inventory ? (
                  <>
                    <span className="font-semibold text-emerald-700">In stock</span>{' '}
                    <span className="text-muted-foreground">— {product.stock_quantity} available</span>
                  </>
                ) : (
                  <span className="font-semibold text-emerald-700">In stock</span>
                )}
              </p>
            )}
          </div>

          {/* Action grid: a 2-column grid on tablet+ stacks neatly to one column
              on phones. `[&>*]:w-full` stretches each button (which is
              `inline-flex` by default) to fill its grid cell, so widths line up.
              Order is hierarchy-led: primary CTAs (Add to cart + WhatsApp) on
              the top row, secondaries (Save + Call) on the bottom. */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:w-full">
            <AddToCartButton
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.featured_image_url,
                sku: product.sku,
              }}
              mode={isOutOfStock ? 'unavailable' : isPreOrder ? 'preorder' : 'add'}
            />
            <a
              href={`https://wa.me/${settings.whatsapp}?text=${inquiryMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              <span aria-hidden="true">💬 </span>Buy via WhatsApp
            </a>
            <WishlistButton slug={product.slug} productName={product.name} />
            <a
              href={`tel:${settings.phone}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border-2 border-sidebar-border bg-sidebar px-6 py-3 font-semibold text-sidebar-foreground transition-colors hover:bg-secondary"
            >
              <span aria-hidden="true">📞 </span>
              <span className="sm:hidden">Call us</span>
              <span className="hidden sm:inline">Call {settings.phone}</span>
            </a>
          </div>

          {Object.keys(specs).length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
              <dl className="overflow-hidden rounded-md bg-card ring-1 ring-border">
                {Object.entries(specs).map(([k, v], i) => (
                  <div
                    key={k}
                    className={`grid grid-cols-3 text-sm ${i % 2 ? 'bg-black/[0.04]' : ''}`}
                  >
                    <dt className="col-span-1 px-4 py-2 font-medium text-muted-foreground capitalize">
                      {k.replace(/_/g, ' ')}
                    </dt>
                    <dd className="col-span-2 break-words px-4 py-2 text-card-foreground">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div className="prose-theme prose-sm mt-8 max-w-none">
              <h2 className="text-lg font-semibold text-foreground">Description</h2>
              <p>{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-16">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="related-heading" className="text-xl font-bold">
              You may also like
            </h2>
            {product.category_id && category && (
              <Link
                href={`/categories/${category.slug}`}
                className="text-sm font-medium text-link underline-offset-4 hover:underline"
              >
                More in {category.name} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {brand && brandMoreDeduped.length >= 3 && (
        <section aria-labelledby="brand-related-heading" className="mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <h2 id="brand-related-heading" className="text-xl font-bold">
              More from <span translate="no">{brand.name}</span>
            </h2>
            <Link
              href={`/brands/${brand.slug}`}
              className="text-sm font-medium text-link underline-offset-4 hover:underline"
            >
              All <span translate="no">{brand.name}</span> products{' '}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {brandMoreDeduped.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed — excludes the current product so the visitor isn't
          looking at themselves. Returns null until the visitor has 2+ items. */}
      <RecentlyViewedStrip excludeSlug={product.slug} minItems={2} />
    </div>
  );
}
