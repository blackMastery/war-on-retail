/**
 * Cart line item — a snapshot of a product at the moment it was added.
 *
 * We deliberately denormalise name / price / image / sku here so:
 *   - `/cart` renders instantly from localStorage without round-tripping Supabase
 *   - The cart shows what the customer added (price they saw), even if the
 *     catalogue row changes or disappears later
 *
 * The trade-off is staleness: if a price changes server-side, the cart shows
 * the original. For a WhatsApp-fulfilled retailer that's actually fine — the
 * human on the other end of WhatsApp confirms current prices before sale.
 */
export type CartItem = {
  /** Stable identity. Use product.id (uuid). */
  productId: string;
  /** For linking to /products/[slug]. */
  slug: string;
  /** Display name. */
  name: string;
  /** Snapshot of price at add-to-cart time (GYD). */
  price: number;
  /** Optional product image URL for the cart thumbnail. */
  imageUrl: string | null;
  /** Optional SKU — included in the WhatsApp message for staff lookup. */
  sku: string | null;
  /** Whole number ≥ 1. */
  quantity: number;
  /**
   * Snapshot of whether the customer was looking at a Pre-order CTA when they
   * added the line. Purely a UI hint for the cart/checkout pills — server
   * authoritatively re-classifies at `place_order` based on live stock +
   * the product's `is_pre_order_enabled` flag.
   *
   * Optional + default-false on hydration so legacy localStorage rows from
   * before this field existed don't need a migration.
   */
  isPreOrder?: boolean;
};
