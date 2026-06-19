'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
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
export default function WishlistIcon({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const count = useWishlistStore(selectWishlistCount);
  const hydrated = useWishlistHydrated();
  const showBadge = hydrated && count > 0;
  const isDark = tone === 'dark';

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
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        isDark
          ? 'hover:bg-white/10 focus-visible:ring-offset-header'
          : 'hover:bg-muted focus-visible:ring-offset-background'
      }`}
    >
      <HeartIcon className="h-6 w-6" aria-hidden="true" />
      <AnimatePresence>
        {showBadge && (
          <motion.span
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.25, 1], opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', times: [0, 0.6, 1] }}
            aria-hidden="true"
            className={`absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-primary-foreground px-1 text-[10px] font-bold leading-none ring-2 tabular-nums ${
              isDark ? 'ring-header' : 'ring-background'
            }`}
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
