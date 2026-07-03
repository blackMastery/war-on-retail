import { productAvailability } from '@/lib/products/availability';
import { variantLabelFrom, type CartItem } from './types';

/** Product slice returned by the cart_items → products join. */
export type CartHydrationProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  featured_image_url: string | null;
  sku: string | null;
  track_inventory: boolean;
  stock_quantity: number;
  is_pre_order_enabled: boolean;
};

/** Variant slice for lines that carry a variant_id. */
export type CartHydrationVariant = {
  id: string;
  option_values: Record<string, string>;
  sku: string | null;
  price: number;
  stock_quantity: number;
  image_url: string | null;
};

export type CartHydrationRow = {
  quantity: number;
  products: CartHydrationProduct;
  /** Null/absent for variantless lines. */
  variant?: CartHydrationVariant | null;
};

/** Map joined cart_items + products (+ variant) rows into client CartItem snapshots. */
export function hydrateCartItems(rows: CartHydrationRow[]): CartItem[] {
  return rows.map(({ quantity, products: p, variant }) => ({
    productId: p.id,
    slug: p.slug,
    name: p.name,
    // Variant lines price/sku/image from the variant row; pre-order status is
    // the variant's stock against the product-level flags.
    price: variant ? variant.price : p.price,
    imageUrl: variant?.image_url ?? p.featured_image_url,
    sku: variant ? variant.sku ?? p.sku : p.sku,
    quantity,
    isPreOrder:
      productAvailability({
        track_inventory: p.track_inventory,
        stock_quantity: variant ? variant.stock_quantity : p.stock_quantity,
        is_pre_order_enabled: p.is_pre_order_enabled,
      }) === 'pre-order',
    variantId: variant?.id ?? null,
    variantLabel: variant ? variantLabelFrom(variant.option_values) : null,
  }));
}
