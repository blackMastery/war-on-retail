'use client';

import { motion } from 'framer-motion';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useWishlistHydrated, useWishlistStore } from '@/lib/wishlist/store';

/** A heart that pops when it becomes "saved". Keyed on state so toggling on
 *  replays the bounce; toggling off just swaps the icon. */
function Heart({
  saved,
  solidClassName = '',
  outlineClassName = 'text-current',
}: {
  saved: boolean;
  solidClassName?: string;
  outlineClassName?: string;
}) {
  return (
    <motion.span
      key={saved ? 'on' : 'off'}
      initial={saved ? { scale: 0.6 } : false}
      animate={saved ? { scale: [0.6, 1.2, 1] } : { scale: 1 }}
      transition={{ duration: 0.28, ease: 'easeOut', times: [0, 0.6, 1] }}
      className="inline-flex"
    >
      {saved ? (
        <HeartSolid className={`h-5 w-5 ${solidClassName}`} aria-hidden="true" />
      ) : (
        <HeartOutline className={`h-5 w-5 ${outlineClassName}`} aria-hidden="true" />
      )}
    </motion.span>
  );
}

type Props = {
  slug: string;
  productName: string;
  /** `button` — labelled outline button used in the product detail action row.
   *  `icon`   — bare heart-icon button, e.g. floating over a card or strip. */
  variant?: 'button' | 'icon';
};

/**
 * Heart toggle that adds/removes a slug from the wishlist store.
 *
 * Two visual variants:
 *   - `button` — pairs nicely with "Add to cart" and "Buy via WhatsApp" on the
 *      detail page. Outlined when off, primary-tinted when on.
 *   - `icon`   — bare 44 × 44 px circular button. Fine target on touch.
 *
 * Hydration: until the store has read localStorage, the heart shows as
 * outlined regardless of the actual saved state (avoids the SSR flicker).
 * Clicks still work pre-hydration — toggling will be reflected the moment
 * hydration completes.
 */
export default function WishlistButton({ slug, productName, variant = 'button' }: Props) {
  const hydrated = useWishlistHydrated();
  const isSaved = useWishlistStore((s) => s.slugs.includes(slug));
  const toggle = useWishlistStore((s) => s.toggle);

  // Pre-hydration: render the off state so server and client agree.
  const displaySaved = hydrated && isSaved;

  const label = displaySaved
    ? `Remove ${productName} from wishlist`
    : `Save ${productName} to wishlist`;

  if (variant === 'icon') {
    return (
      <motion.button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(slug);
        }}
        aria-label={label}
        aria-pressed={displaySaved}
        whileTap={{ scale: 0.85 }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-gray-200 transition hover:bg-white hover:shadow-md ${
          displaySaved ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
        }`}
      >
        <Heart saved={displaySaved} />
      </motion.button>
    );
  }

  // Default: text + icon button matching the detail-page action row.
  return (
    <motion.button
      type="button"
      onClick={() => toggle(slug)}
      aria-label={label}
      aria-pressed={displaySaved}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border-2 px-6 py-3 font-semibold transition-colors ${
        displaySaved
          ? 'border-primary-600 bg-primary-600 text-white hover:bg-primary-700'
          : 'border-accent-800 bg-accent-400 text-gray-900 hover:bg-accent-300'
      }`}
    >
      <Heart saved={displaySaved} outlineClassName="text-primary-700" />
      {displaySaved ? 'Saved' : 'Save'}
    </motion.button>
  );
}
