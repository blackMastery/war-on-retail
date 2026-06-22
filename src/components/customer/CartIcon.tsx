'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { selectItemCount, useCartHydrated, useCartStore } from '@/lib/cart/store';

/**
 * Header cart icon with item-count badge.
 *
 * Hydration: the count is rendered as `null` until the store finishes
 * reading from localStorage. That avoids the SSR-says-0 → client-says-3
 * flicker, which would also throw a React hydration warning. The icon
 * itself (and the link to /cart) renders in both phases so the visual
 * position doesn't shift on hydration.
 */
export default function CartIcon({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const count = useCartStore(selectItemCount);
  const hydrated = useCartHydrated();
  const showBadge = hydrated && count > 0;
  const isDark = tone === 'dark';

  return (
    <Link
      href="/cart"
      aria-label={
        hydrated
          ? count === 0
            ? 'Cart is empty'
            : `Cart, ${count} ${count === 1 ? 'item' : 'items'}`
          : 'Cart'
      }
      className={`relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
        isDark
          ? 'hover:bg-white/10 focus-visible:ring-offset-header'
          : 'hover:bg-muted focus-visible:ring-offset-background'
      }`}
    >
      <ShoppingCartIcon
        className={`h-6 w-6 shrink-0 ${isDark ? 'text-header-foreground' : 'text-foreground'}`}
        aria-hidden="true"
      />
      <AnimatePresence>
        {showBadge && (
          <motion.span
            // Keyed by count so each change replays a small scale-pop, drawing
            // the eye to "something was added". Initial pop also covers appear.
            key={count}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.25, 1], opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', times: [0, 0.6, 1] }}
            aria-hidden="true"
            className={`absolute -right-0.5 -top-0.5 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground ring-2 tabular-nums ${
              isDark ? 'ring-header' : 'ring-chart-1'
            }`}
          >
            {count > 99 ? '99+' : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
