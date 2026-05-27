import type { Metadata } from 'next';
import WishlistView from './WishlistView';

export const metadata: Metadata = {
  title: 'Wishlist',
  // Per-visitor state — no SEO value, don't index.
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold">Your wishlist</h1>
      <p className="mt-1 text-sm text-gray-600">
        Products you've saved for later. Add them to cart whenever you're ready.
      </p>
      <WishlistView />
    </div>
  );
}
