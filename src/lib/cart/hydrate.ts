import { productAvailability } from '@/lib/products/availability';
import type { CartItem } from './types';

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

export type CartHydrationRow = {
  quantity: number;
  products: CartHydrationProduct;
};

/** Map joined cart_items + products rows into client CartItem snapshots. */
export function hydrateCartItems(rows: CartHydrationRow[]): CartItem[] {
  return rows.map(({ quantity, products: p }) => ({
    productId: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    imageUrl: p.featured_image_url,
    sku: p.sku,
    quantity,
    isPreOrder: productAvailability(p) === 'pre-order',
  }));
}
