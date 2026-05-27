import Link from 'next/link';
import Image from 'next/image';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import { isNewArrival } from '@/config/catalog';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
}

/**
 * Product card with two click targets layered:
 *
 *   1. **Overlay <Link>**  — absolute, fills the card, `z-0`. The whole card
 *      acts as one big link to /products/[slug]. The Link comes AFTER all
 *      visible content in the DOM so its stacking order puts it above plain
 *      text/image but below the action buttons.
 *
 *   2. **Action buttons** — `<WishlistButton>` (heart, top-right corner of
 *      image) and `<AddToCartButton>` (full-width compact, bottom of card
 *      body). Both have `z-10` and call `stopPropagation` on their click so
 *      they intercept their own taps without firing the overlay link's
 *      navigation.
 *
 *  This is the standard "card link" pattern. The alternative (separate links
 *  for image and title with siblings buttons) is more semantic HTML but loses
 *  the "click anywhere on the card to navigate" UX that everyone expects from
 *  e-commerce cards.
 */
export default function ProductCard({ product }: ProductCardProps) {
  const discount = calculateDiscount(product.price, product.compare_at_price);
  const isOutOfStock = product.track_inventory && product.stock_quantity === 0;
  const isLowStock =
    product.track_inventory &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= product.low_stock_threshold;
  const isNew = isNewArrival(product.created_at);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md">
      {/* Image area */}
      <div className="relative aspect-square bg-gray-100">
        {product.featured_image_url ? (
          <Image
            src={product.featured_image_url}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-5xl text-gray-300"
            aria-hidden="true"
          >
            📦
          </div>
        )}

        {/* Badge stack — all positive/urgency signals piled top-left, leaves
            the top-right corner free for the wishlist heart. */}
        <div className="absolute left-2 top-2 flex flex-col gap-1">
          {discount > 0 && (
            <span className="rounded bg-primary-600 px-2 py-0.5 text-xs font-bold text-white">
              -{discount}%
            </span>
          )}
          {product.is_featured && (
            <span className="rounded bg-yellow-500 px-2 py-0.5 text-xs font-bold text-white">
              Featured
            </span>
          )}
          {isLowStock && (
            <span className="rounded bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
              Low stock
            </span>
          )}
          {isNew && (
            <span className="rounded bg-emerald-500 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
              New
            </span>
          )}
        </div>

        {/* Wishlist heart — top-right corner, z-10 to beat the overlay link.
            stopPropagation lives inside the button component itself. */}
        <div className="absolute right-2 top-2 z-10">
          <WishlistButton slug={product.slug} productName={product.name} variant="icon" />
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <span className="rounded bg-gray-900 px-3 py-1.5 text-sm font-bold text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 min-h-[2.75rem] font-semibold text-gray-900 group-hover:text-primary-600">
          {product.name}
        </h3>
        {product.short_description && (
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{product.short_description}</p>
        )}
        <div className="mt-3 flex items-baseline gap-2 tabular-nums">
          <span className="text-lg font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.compare_at_price && product.compare_at_price > product.price && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
        {product.track_inventory && !isOutOfStock && (
          <p className="mt-1 text-xs text-gray-500">{product.stock_quantity} in stock</p>
        )}

        {/* Add to cart — sits in its own row, mt-auto pushes it to the bottom
            even when card heights vary in a grid. z-10 + stopPropagation
            (inside the component) prevents the overlay link from firing. */}
        <div className="relative z-10 mt-auto pt-3">
          <AddToCartButton
            variant="compact"
            disabled={isOutOfStock}
            product={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              imageUrl: product.featured_image_url,
              sku: product.sku,
            }}
          />
        </div>
      </div>

      {/* Overlay link — last in the DOM so it sits on top of plain content
          (image + text) but below the z-10 action buttons. */}
      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      />
    </article>
  );
}
