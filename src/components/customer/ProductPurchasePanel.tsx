'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { productAvailability } from '@/lib/products/availability';
import { variantLabelFrom } from '@/lib/cart/types';
import AddToCartButton from '@/components/customer/AddToCartButton';
import ProductGallery from '@/components/customer/ProductGallery';
import VariantSelector from '@/components/customer/VariantSelector';
import WishlistButton from '@/components/customer/WishlistButton';
import type { ProductImageMeta, ProductOption, ProductVariant } from '@/types/database';

/** Serialisable slice of the product the panel needs. */
type PanelProduct = {
  id: string;
  slug: string;
  name: string;
  sku: string | null;
  price: number;
  featured_image_url: string | null;
  short_description: string | null;
  description: string | null;
  track_inventory: boolean;
  is_pre_order_enabled: boolean;
  pre_order_message: string | null;
  specifications: Record<string, unknown>;
};

type Props = {
  product: PanelProduct;
  brand: { name: string; slug: string } | null;
  options: ProductOption[];
  /** Active variants, in position order. */
  variants: ProductVariant[];
  images: string[];
  imageMeta: Record<string, ProductImageMeta>;
  settings: { whatsapp: string; phone: string };
};

/**
 * Client island for variantized products — replaces the detail page's static
 * two-column grid so the gallery, price, stock card and add-to-cart all react
 * to the chosen options together. Variantless products never render this;
 * they keep the original server-rendered markup.
 */
export default function ProductPurchasePanel({
  product,
  brand,
  options,
  variants,
  images,
  imageMeta,
  settings,
}: Props) {
  // Default to the first in-stock variant so the initial CTA is buyable;
  // fall back to the first variant when everything is out of stock.
  const [selected, setSelected] = useState<Record<string, string>>(() => {
    const first =
      variants.find((v) => v.stock_quantity > 0 || !product.track_inventory) ?? variants[0];
    return first ? { ...first.option_values } : {};
  });

  const selectedVariant = useMemo(
    () =>
      variants.find((v) =>
        options.every((opt) => v.option_values[opt.name] === selected[opt.name]),
      ) ?? null,
    [variants, options, selected],
  );

  function handleSelect(optionName: string, value: string) {
    const next = { ...selected, [optionName]: value };
    const exact = variants.some((v) =>
      options.every((opt) => v.option_values[opt.name] === next[opt.name]),
    );
    if (exact) {
      setSelected(next);
      return;
    }
    // The combination doesn't exist — snap the other options to the first
    // variant that carries the clicked value, so the click always lands
    // somewhere purchasable.
    const fallback = variants.find((v) => v.option_values[optionName] === value);
    if (fallback) setSelected({ ...fallback.option_values });
  }

  const price = selectedVariant?.price ?? product.price;
  const compareAt = selectedVariant?.compare_at_price ?? null;
  const discount = calculateDiscount(price, compareAt);
  const sku = selectedVariant?.sku ?? product.sku;
  const variantLabel = selectedVariant ? variantLabelFrom(selectedVariant.option_values) : null;

  const availability = selectedVariant
    ? productAvailability({
        track_inventory: product.track_inventory,
        stock_quantity: selectedVariant.stock_quantity,
        is_pre_order_enabled: product.is_pre_order_enabled,
      })
    : 'out-of-stock';
  const isOutOfStock = availability === 'out-of-stock';
  const isPreOrder = availability === 'pre-order';

  const specs = product.specifications;
  const inquiryMessage = encodeURIComponent(
    `Hi War on Retail, I'm interested in "${product.name}"${
      variantLabel ? ` (${variantLabel})` : ''
    } (SKU ${sku ?? 'n/a'}).`,
  );

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Gallery — follows the chosen variant's image. */}
      <ProductGallery
        images={images}
        productName={product.name}
        discount={discount}
        imageMeta={imageMeta}
        activeUrl={selectedVariant?.image_url ?? null}
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
        <h1 className="mt-1 text-pretty text-2xl font-bold text-foreground sm:text-3xl">
          {product.name}
        </h1>
        {sku && <p className="mt-1 text-xs text-muted-foreground">SKU: {sku}</p>}

        <div className="mt-4 flex flex-wrap items-baseline gap-3">
          <span className="text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {formatPrice(price)}
          </span>
          {compareAt != null && compareAt > price && (
            <del className="text-lg text-muted-foreground line-through">
              <span className="sr-only">Original price: </span>
              {formatPrice(compareAt)}
            </del>
          )}
        </div>

        {product.short_description && (
          <p className="mt-4 text-secondary-foreground">{product.short_description}</p>
        )}

        <VariantSelector
          options={options}
          variants={variants}
          selected={selected}
          onSelect={handleSelect}
        />

        <div
          className={`mt-6 rounded-md bg-card p-4 ring-1 ring-border ${
            isPreOrder ? 'ring-blue-200' : ''
          }`}
          aria-live="polite"
        >
          {isPreOrder ? (
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-blue-800">Pre-order — ships once restocked</p>
              {product.pre_order_message ? (
                <p className="text-blue-900">{product.pre_order_message}</p>
              ) : (
                <p className="text-blue-900">
                  Our team will confirm the expected ship date by phone after you place the
                  order.
                </p>
              )}
            </div>
          ) : isOutOfStock ? (
            <p className="font-semibold text-destructive">
              {selectedVariant ? 'Currently out of stock' : 'This combination is unavailable'}
            </p>
          ) : (
            <p className="text-sm text-card-foreground">
              {product.track_inventory && selectedVariant ? (
                <>
                  <span className="font-semibold text-emerald-700">In stock</span>{' '}
                  <span className="text-muted-foreground">
                    — {selectedVariant.stock_quantity} available
                  </span>
                </>
              ) : (
                <span className="font-semibold text-emerald-700">In stock</span>
              )}
            </p>
          )}
        </div>

        {/* Action grid — same layout as the variantless page. */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 [&>*]:w-full">
          <AddToCartButton
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price,
              imageUrl: selectedVariant?.image_url ?? product.featured_image_url,
              sku,
              variantId: selectedVariant?.id ?? null,
              variantLabel,
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
                  <dd className="col-span-2 break-words px-4 py-2 text-card-foreground">
                    {String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {product.description && (
          <div className="prose-theme prose-sm mt-8 max-w-none">
            <h2 className="text-lg font-semibold text-foreground">Description</h2>
            <p className="text-black">{product.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
