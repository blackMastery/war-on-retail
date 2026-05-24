import Link from 'next/link';
import Image from 'next/image';
import { calculateDiscount, formatPrice } from '@/lib/utils';
import type { Product } from '@/types/database';

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const discount = calculateDiscount(product.price, product.compare_at_price);
  const isOutOfStock = product.track_inventory && product.stock_quantity === 0;
  const isLowStock =
    product.track_inventory &&
    product.stock_quantity > 0 &&
    product.stock_quantity <= product.low_stock_threshold;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200 transition hover:shadow-md"
    >
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
        </div>

        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="rounded bg-gray-900 px-3 py-1.5 text-sm font-bold text-white">
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
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
      </div>
    </Link>
  );
}
