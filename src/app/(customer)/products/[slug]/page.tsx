import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import AddToCartButton from '@/components/customer/AddToCartButton';
import CompareToggle from '@/components/customer/CompareToggle';
import ProductCard from '@/components/customer/ProductCard';
import ProductGallery from '@/components/customer/ProductGallery';
import RecentlyViewedStrip from '@/components/customer/RecentlyViewedStrip';
import RecentlyViewedTracker from '@/components/customer/RecentlyViewedTracker';
import WishlistButton from '@/components/customer/WishlistButton';
import { fetchMoreFromBrand, fetchRelatedProducts } from '@/lib/products/recommendations';
import { buildProductJsonLd } from '@/lib/products/structured-data';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('name, short_description, meta_title, meta_description')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: 'Product not found' };
  return {
    title: data.meta_title ?? data.name,
    description: data.meta_description ?? data.short_description ?? undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

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
  const allImages = [product.featured_image_url, ...(product.image_urls ?? [])].filter(
    Boolean,
  ) as string[];
  const isOutOfStock = product.track_inventory && product.stock_quantity === 0;
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
  const jsonLd = buildProductJsonLd({ product, brand, images: allImages });

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

      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-primary-600">
          Home
        </Link>{' '}
        /{' '}
        {category && (
          <>
            <Link
              href={`/categories/${category.slug}`}
              className="hover:text-primary-600"
            >
              {category.name}
            </Link>{' '}
            /{' '}
          </>
        )}
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Gallery */}
        <ProductGallery
          images={allImages}
          productName={product.name}
          discount={discount}
        />

        {/* Detail */}
        <div>
          {brand && (
            <Link
              href={`/brands/${brand.slug}`}
              className="text-sm font-medium uppercase tracking-wide text-primary-600 hover:underline"
            >
              {brand.name}
            </Link>
          )}
          <h1 className="mt-1 text-3xl font-bold text-gray-900">{product.name}</h1>
          {product.sku && <p className="mt-1 text-xs text-gray-500">SKU: {product.sku}</p>}

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-gray-900">{formatPrice(product.price)}</span>
            {product.compare_at_price && product.compare_at_price > product.price && (
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>

          {product.short_description && (
            <p className="mt-4 text-gray-700">{product.short_description}</p>
          )}

          <div className="mt-6 rounded-md bg-gray-50 p-4 ring-1 ring-gray-200">
            {isOutOfStock ? (
              <p className="font-semibold text-red-600">Currently out of stock</p>
            ) : (
              <p className="text-sm">
                {product.track_inventory ? (
                  <>
                    <span className="font-semibold text-green-700">In stock</span>{' '}
                    <span className="text-gray-500">— {product.stock_quantity} available</span>
                  </>
                ) : (
                  <span className="font-semibold text-green-700">In stock</span>
                )}
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <AddToCartButton
              product={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                imageUrl: product.featured_image_url,
                sku: product.sku,
              }}
              disabled={isOutOfStock}
            />
            <WishlistButton slug={product.slug} productName={product.name} />
            <CompareToggle slug={product.slug} productName={product.name} />
            <a
              href={`https://wa.me/${siteConfig.whatsapp}?text=${inquiryMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
            >
              <span aria-hidden="true">💬 </span>Buy via WhatsApp
            </a>
            <a
              href={`tel:${siteConfig.phone}`}
              className="inline-flex items-center gap-2 rounded-md border-2 border-gray-300 px-6 py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              <span aria-hidden="true">📞 </span>Call {siteConfig.phone}
            </a>
          </div>

          {Object.keys(specs).length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
              <dl className="overflow-hidden rounded-md ring-1 ring-gray-200">
                {Object.entries(specs).map(([k, v], i) => (
                  <div
                    key={k}
                    className={`grid grid-cols-3 text-sm ${i % 2 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <dt className="col-span-1 px-4 py-2 font-medium text-gray-600 capitalize">
                      {k.replace(/_/g, ' ')}
                    </dt>
                    <dd className="col-span-2 px-4 py-2 text-gray-900">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.description && (
            <div className="prose prose-sm mt-8 max-w-none">
              <h2 className="text-lg font-semibold">Description</h2>
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
                className="text-sm font-medium text-primary-600 hover:underline"
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
              className="text-sm font-medium text-primary-600 hover:underline"
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
