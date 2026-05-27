import type { Metadata } from 'next';
import CartView from './CartView';

export const metadata: Metadata = {
  title: 'Cart',
  // No need to index the cart page — it's a per-visitor state view, never SEO-relevant.
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <CartView />
    </div>
  );
}
