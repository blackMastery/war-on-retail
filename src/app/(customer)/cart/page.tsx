import { pageMetadata } from '@/lib/page-seo';
import CartView from './CartView';

export async function generateMetadata() {
  // Defaults to noindex (per-visitor state view) — the page_seo row's
  // `robots_index` is seeded false; the admin can flip it on at their own risk.
  return pageMetadata('cart', { title: 'Cart' });
}

export default function CartPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <CartView />
    </div>
  );
}
