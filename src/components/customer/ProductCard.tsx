import Link from 'next/link';
import Image from 'next/image';
import { calculateDiscount, formatPrice, cn } from '@/lib/utils';
import { isNewArrival } from '@/config/catalog';
import { productAvailability } from '@/lib/products/availability';
import AddToCartButton from './AddToCartButton';
import WishlistButton from './WishlistButton';
import type { Product } from '@/types/database';

/** Default `sizes` for 2-up mobile grids and responsive product listings. */
const DEFAULT_IMAGE_SIZES =
  '(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 45vw';

interface ProductCardProps {
  product: Product;
  /** Pass a fixed width (e.g. `240px`) when the card lives in a horizontal scroller. */
  imageSizes?: string;
  /** `strip` — fixed-height cards for horizontal product carousels. */
  layout?: 'default' | 'strip';
  className?: string;
}

/**
 * Product card with two click targets layered:
 *
 *   1. **Overlay <Link>**  — absolute, fills the card, `z-0`. The whole card
 *      acts as one big link to /products/[slug]. The Link comes AFTER all
 *      visible content in the DOM so its stacking order puts it above plain
 *      text/image but below the action buttons.
 *
 *   2. **Action buttons** — `<WishlistButton>` (heart, bottom-right of the
 *      image) and `<AddToCartButton>` (full-width compact, bottom of card
 *      body). Both have `z-10` and call `stopPropagation` on their click so
 *      they intercept their own taps without firing the overlay link's
 *      navigation.
 */
export default function ProductCard({
  product,
  imageSizes = DEFAULT_IMAGE_SIZES,
  layout = 'default',
  className,
}: ProductCardProps) {
  const isStrip = layout === 'strip';
  // Variantized products: the base price/compare-at aren't what the customer
  // pays, so show a "from {min}" price and no discount badge instead.
  const hasVariants = product.has_variants && product.variant_price_min != null;
  const discount = hasVariants
    ? 0
    : calculateDiscount(product.price, product.compare_at_price);
  const availability = productAvailability(product);
  const isOutOfStock = availability === 'out-of-stock';
  const isPreOrder = availability === 'pre-order';
  const isLowStock =
    availability === 'in-stock' &&
    product.stock_quantity <= product.low_stock_threshold;
  const isNew = isNewArrival(product.created_at);

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-lg bg-card shadow-sm ring-1 ring-border',
        'transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-lg hover:ring-border motion-reduce:transform-none',
        isStrip && 'h-full',
        className,
      )}
    >
      {/* Image area */}
      <div className="relative aspect-square bg-muted">
        {product.featured_image_url ? (
          <Image
            src={product.featured_image_url}
            alt={product.name}
            fill
            sizes={imageSizes}
            className="object-cover transition-transform duration-300 motion-reduce:transform-none group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-5xl text-muted-foreground"
            aria-hidden="true"
          >
            📦
          </div>
        )}

        {/* Badge stack — top-left; wishlist sits bottom-right of the image. */}
        <div className="absolute left-1.5 top-1.5 flex flex-col gap-0.5 sm:left-2 sm:top-2 sm:gap-1">
          {discount > 0 && (
            <span className="rounded bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold sm:px-2 sm:text-xs">
              -{discount}%
            </span>
          )}
          {product.is_featured && (
            <span className="rounded bg-chart-1 px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground sm:px-2 sm:text-xs">
              Featured
            </span>
          )}
          {isLowStock && (
            <span className="rounded bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold text-white sm:px-2 sm:text-xs">
              Low stock
            </span>
          )}
          {isNew && (
            <span className="rounded bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-xs">
              New
            </span>
          )}
          {isPreOrder && (
            <span className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white sm:px-2 sm:text-xs">
              Pre-order
            </span>
          )}
        </div>

        <div className="absolute bottom-1.5 right-1.5 z-10 sm:bottom-2 sm:right-2">
          <WishlistButton slug={product.slug} productName={product.name} variant="icon" />
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50">
            <span className="rounded bg-card px-2 py-1 text-xs font-bold text-card-foreground sm:px-3 sm:py-1.5 sm:text-sm">
              Out of stock
            </span>
          </div>
        )}
      </div>

      {/* Card body — tighter padding/typography on 2-col mobile grids. */}
      <div className={cn('flex flex-1 flex-col', isStrip ? 'p-4' : 'p-3 sm:p-4')}>
        <h3
          className={cn(
            'line-clamp-2 font-semibold text-foreground',
            isStrip
              ? 'min-h-[2.75rem] text-base sm:group-hover:text-link-on-light'
              : 'min-h-[2.5rem] text-sm sm:min-h-[2.75rem] sm:text-base sm:group-hover:text-link-on-light',
          )}
        >
          {product.name}
        </h3>
        {!isStrip && product.short_description && (
          <p className="mt-1 hidden line-clamp-2 text-sm text-muted-foreground sm:block">
            {product.short_description}
          </p>
        )}
        <div
          className={cn(
            'flex flex-wrap items-baseline gap-x-2 gap-y-0.5 tabular-nums',
            isStrip ? 'mt-3 min-h-[1.75rem]' : 'mt-2 sm:mt-3',
          )}
        >
          <span
            className={cn(
              'font-bold text-foreground',
              isStrip ? 'text-lg' : 'text-base sm:text-lg',
            )}
          >
            {hasVariants ? (
              <>
                {product.variant_price_min !== product.variant_price_max && (
                  <span className="text-xs font-normal text-muted-foreground">from </span>
                )}
                {formatPrice(product.variant_price_min as number)}
              </>
            ) : (
              formatPrice(product.price)
            )}
          </span>
          {!hasVariants &&
            product.compare_at_price != null &&
            product.compare_at_price > product.price && (
              <del className="text-xs text-muted-foreground line-through sm:text-sm">
                <span className="sr-only">Original price: </span>
                {formatPrice(product.compare_at_price)}
              </del>
            )}
        </div>
        {!isStrip && product.track_inventory && !isOutOfStock && (
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            {product.stock_quantity} in stock
          </p>
        )}

        <div className={cn('relative z-10 mt-auto', isStrip ? 'pt-3' : 'pt-2 sm:pt-3')}>
          <AddToCartButton
            variant="compact"
            // Variantized products can't be added from the card — the parent
            // line would be rejected at checkout (VARIANT_REQUIRED). Send the
            // customer to the product page to pick options instead.
            mode={
              isOutOfStock
                ? 'unavailable'
                : product.has_variants
                  ? 'choose'
                  : isPreOrder
                    ? 'preorder'
                    : 'add'
            }
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

      <Link
        href={`/products/${product.slug}`}
        aria-label={product.name}
        className="absolute inset-0 z-0 rounded-lg transition-colors active:bg-secondary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </article>
  );
}
