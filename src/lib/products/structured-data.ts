import { siteConfig } from '@/config/site';
import type { Brand, Product } from '@/types/database';

/**
 * Builds a Schema.org `Product` JSON-LD payload for a product detail page.
 *
 * Why bother:
 *   - Google can render rich results in SERPs (price + stock pill directly
 *     under the listing), which lifts CTR.
 *   - Google Shopping uses Product structured data as one input for product
 *     listings, even when not running Merchant Center.
 *
 * Choices documented inline. Conditionals avoid emitting empty/undefined
 * fields, which is required for valid Schema.org output.
 */
export function buildProductJsonLd(opts: {
  product: Product;
  brand: Pick<Brand, 'name'> | null;
  images: string[];
}): Record<string, unknown> {
  const { product, brand, images } = opts;
  const base = siteConfig.url.replace(/\/+$/, '');
  const url = `${base}/products/${product.slug}`;

  // PostgREST sometimes returns numerics as strings; coerce to be safe.
  const price = typeof product.price === 'string' ? Number(product.price) : product.price;

  const isOutOfStock = product.track_inventory && product.stock_quantity === 0;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    sku: product.sku ?? undefined,
    image: images.length ? images : undefined,
    description: product.description ?? product.short_description ?? undefined,
    brand: brand ? { '@type': 'Brand', name: brand.name } : undefined,
    offers: {
      '@type': 'Offer',
      url,
      // GYD = Guyanese Dollar (ISO 4217). Currency is required for Google.
      priceCurrency: 'GYD',
      price: price.toFixed(2),
      availability: isOutOfStock
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: siteConfig.name },
      // Valid through: 1 year out. Google warns if missing on time-bound offers;
      // for general retail this just means "this offer doesn't expire soon".
      priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10),
    },
  };

  // Strip undefined keys so the emitted JSON is clean.
  for (const k of Object.keys(jsonLd)) {
    if (jsonLd[k] === undefined) delete jsonLd[k];
  }
  return jsonLd;
}
