import type { Brand, Product, ProductImageMeta } from '@/types/database';

/**
 * Slice of the store settings the JSON-LD output needs — the canonical
 * https:// URL and the brand name used as the offer seller. Caller threads
 * these in from `getStoreSettings()` so the structured data reflects admin
 * edits instead of compile-time env defaults.
 */
export type StructuredDataStoreInfo = {
  name: string;
  url: string;
};

/**
 * Per-image JSON-LD. When the admin has set caption/keywords/alt, emit an
 * ImageObject so Google can index those signals. Otherwise the bare URL
 * string is fine (also valid Schema.org).
 */
function imageEntry(
  url: string,
  meta: ProductImageMeta | undefined,
): string | Record<string, unknown> {
  if (!meta) return url;
  const alt = meta.alt?.trim();
  const caption = meta.caption?.trim();
  const keywords = meta.keywords?.trim();
  if (!alt && !caption && !keywords) return url;
  return {
    '@type': 'ImageObject',
    contentUrl: url,
    ...(caption ? { caption } : {}),
    ...(alt && !caption ? { name: alt } : {}),
    ...(keywords ? { keywords } : {}),
  };
}

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
  storeInfo: StructuredDataStoreInfo;
}): Record<string, unknown> {
  const { product, brand, images, storeInfo } = opts;
  const base = storeInfo.url.replace(/\/+$/, '');
  const url = `${base}/products/${product.slug}`;

  // PostgREST sometimes returns numerics as strings; coerce to be safe.
  const price = typeof product.price === 'string' ? Number(product.price) : product.price;

  const isOutOfStock = product.track_inventory && product.stock_quantity === 0;

  // Build the image list, using ImageObject for any image that has admin-set
  // metadata. Featured-image alt is mirrored in via the product page; here
  // we just look up by URL.
  const imageMeta = product.image_meta ?? {};
  const imageEntries = images.length
    ? images.map((u) => imageEntry(u, imageMeta[u]))
    : undefined;

  // meta_keywords is comma-separated on the row.
  const keywords = product.meta_keywords
    ? product.meta_keywords.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    url,
    sku: product.sku ?? undefined,
    image: imageEntries,
    description:
      product.meta_description ??
      product.description ??
      product.short_description ??
      undefined,
    keywords: keywords && keywords.length ? keywords : undefined,
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
      seller: { '@type': 'Organization', name: storeInfo.name },
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
