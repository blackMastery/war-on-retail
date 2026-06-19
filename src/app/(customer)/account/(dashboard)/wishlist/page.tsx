import WishlistView from '@/app/(customer)/wishlist/WishlistView';

export const metadata = { title: 'My wishlist' };

export default function AccountWishlistPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">My wishlist</h2>
      <p className="text-sm text-muted-foreground">
        Saved to your account — it follows you across devices.
      </p>
      <WishlistView />
    </div>
  );
}
