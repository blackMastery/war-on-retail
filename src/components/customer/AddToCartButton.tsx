'use client';

import { useEffect, useState } from 'react';
import { CheckIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/lib/cart/store';
import type { CartItem } from '@/lib/cart/types';

type Props = {
  /** The product to add — same fields as a CartItem minus `quantity`. */
  product: Omit<CartItem, 'quantity'>;
  /** True when the product is out of stock — button is disabled and labelled accordingly. */
  disabled?: boolean;
  /**
   * - `primary` — large headline button (product detail page). Inline width.
   * - `compact` — full-width small button (product card). `stopPropagation`
   *    on the click so it doesn't trigger the surrounding card-overlay link.
   */
  variant?: 'primary' | 'compact';
  /** How many to add per click. Defaults to 1; the cart page uses its own steppers. */
  quantity?: number;
};

const FEEDBACK_MS = 1500;

/**
 * Two-state button. Clicking adds the item to the cart store and flips the
 * label to "Added!" with a check icon for ~1.5 s before snapping back. The
 * label change is announced via `aria-live` so screen readers hear it.
 *
 * The store is localStorage-persisted via Zustand, so the addition survives a
 * refresh and is visible to the header `<CartIcon>` immediately.
 */
export default function AddToCartButton({
  product,
  disabled = false,
  variant = 'primary',
  quantity = 1,
}: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);

  // Clear the feedback after FEEDBACK_MS, but reset the timer if the user
  // mashes the button so they always see the latest "Added!" cycle.
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [justAdded]);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // When mounted inside a product card with an overlay link, the click would
    // otherwise bubble up and trigger navigation. Stop it.
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    addItem(product, quantity);
    setJustAdded(true);
  }

  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50';
  const sizing =
    variant === 'primary'
      ? 'px-6 py-3'
      // Compact: full-width small. Designed to sit at the bottom of a ProductCard.
      : 'w-full px-3 py-2 text-sm';
  const colours = justAdded
    ? 'bg-green-600 text-white hover:bg-green-700'
    : 'bg-primary-600 text-white hover:bg-primary-700';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-live="polite"
      className={`${base} ${sizing} ${colours}`}
    >
      {justAdded ? (
        <>
          <CheckIcon className="h-5 w-5" aria-hidden="true" />
          Added{variant === 'primary' ? ' to cart' : ''}
        </>
      ) : disabled ? (
        <>
          <ShoppingBagIcon className="h-5 w-5" aria-hidden="true" />
          Out of stock
        </>
      ) : (
        <>
          <ShoppingBagIcon className="h-5 w-5" aria-hidden="true" />
          Add to cart
        </>
      )}
    </button>
  );
}
