'use client';

import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useWishlistHydrated, useWishlistStore } from '@/lib/wishlist/store';

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
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(slug);
        }}
        aria-label={label}
        aria-pressed={displaySaved}
        className={`flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow ring-1 ring-gray-200 transition hover:bg-white ${
          displaySaved ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
        }`}
      >
        {displaySaved ? (
          <HeartSolid className="h-5 w-5" aria-hidden="true" />
        ) : (
          <HeartOutline className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    );
  }

  // Default: text + icon button matching the detail-page action row.
  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-label={label}
      aria-pressed={displaySaved}
      className={`inline-flex items-center justify-center gap-2 rounded-md border-2 px-6 py-3 font-semibold transition ${
        displaySaved
          ? 'border-primary-600 bg-primary-50 text-primary-700 hover:bg-primary-100'
          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {displaySaved ? (
        <HeartSolid className="h-5 w-5" aria-hidden="true" />
      ) : (
        <HeartOutline className="h-5 w-5" aria-hidden="true" />
      )}
      {displaySaved ? 'Saved' : 'Save'}
    </button>
  );
}
