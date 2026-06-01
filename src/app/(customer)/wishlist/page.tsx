import { pageMetadata } from '@/lib/page-seo';
import WishlistView from './WishlistView';

export async function generateMetadata() {
  return pageMetadata('wishlist', { title: 'Wishlist' });
}

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
