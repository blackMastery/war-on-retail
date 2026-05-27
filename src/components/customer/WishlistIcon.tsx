'use client';

import Link from 'next/link';
import { HeartIcon } from '@heroicons/react/24/outline';
import {
  selectWishlistCount,
  useWishlistHydrated,
  useWishlistStore,
} from '@/lib/wishlist/store';

/**
 * Header wishlist icon with item-count badge. Same hydration-safe pattern as
 * `<CartIcon>` — the badge only renders once the store has read localStorage.
 */
export default function WishlistIcon() {
  const count = useWishlistStore(selectWishlistCount);
  const hydrated = useWishlistHydrated();
  const showBadge = hydrated && count > 0;

  return (
    <Link
      href="/wishlist"
      aria-label={
        hydrated
          ? count === 0
            ? 'Wishlist is empty'
            : `Wishlist, ${count} ${count === 1 ? 'item' : 'items'}`
          : 'Wishlist'
      }
      className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
    >
      <HeartIcon className="h-6 w-6" aria-hidden="true" />
      {showBadge && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white tabular-nums"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
