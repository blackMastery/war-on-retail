'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckIcon, ClockIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/lib/cart/store';
import type { CartItem } from '@/lib/cart/types';

type Mode = 'add' | 'preorder' | 'unavailable';

type Props = {
  /** The product to add — same fields as a CartItem minus `quantity` + `isPreOrder`. */
  product: Omit<CartItem, 'quantity' | 'isPreOrder'>;
  /**
   * Legacy disable hook (kept for callers that haven't migrated to `mode`).
   * When set, behaves the same as `mode='unavailable'`.
   */
  disabled?: boolean;
  /**
   * Drives the button's label, tone, and disabled state.
   *   - `add`         — normal "Add to cart"
   *   - `preorder`    — enabled, label = "Pre-order"; adds the line with `isPreOrder=true`
   *   - `unavailable` — disabled, label = "Out of stock"
   *
   * Defaults to `add` when neither `mode` nor `disabled` is set. Callers
   * derive this from `productAvailability(product)`.
   */
  mode?: Mode;
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
  mode,
  variant = 'primary',
  quantity = 1,
}: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [justAdded, setJustAdded] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // Resolve the effective mode. `disabled=true` overrides whatever mode was
  // passed, matching the old contract; otherwise default to "add".
  const effectiveMode: Mode = disabled ? 'unavailable' : (mode ?? 'add');
  const isPreOrder = effectiveMode === 'preorder';
  const isUnavailable = effectiveMode === 'unavailable';

  // Clear the feedback after FEEDBACK_MS, but reset the timer if the user
  // mashes the button so they always see the latest "Added!" cycle.
  useEffect(() => {
    if (!justAdded) return;
    setStatusMessage(isPreOrder ? 'Added pre-order to cart' : 'Added to cart');
    const t = setTimeout(() => {
      setJustAdded(false);
      setStatusMessage('');
    }, FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [justAdded, isPreOrder]);

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    // When mounted inside a product card with an overlay link, the click would
    // otherwise bubble up and trigger navigation. Stop it.
    e.preventDefault();
    e.stopPropagation();
    if (isUnavailable) return;
    addItem({ ...product, isPreOrder }, quantity);
    setJustAdded(true);
  }

  const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const sizing =
    variant === 'primary'
      ? 'min-h-11 px-6 py-3'
      : 'min-h-11 w-full px-3 py-2.5 text-sm sm:py-2';
  // Tone vocabulary:
  //   added     → green (success)
  //   preorder  → blue (pending stock — distinct from the regular red primary)
  //   default   → primary red
  const colours = justAdded
    ? 'bg-green-600 text-white hover:bg-green-700'
    : isPreOrder
      ? 'bg-blue-600 text-white hover:bg-blue-700'
      : 'bg-primary-600 text-white hover:bg-primary-700';

  const ariaLabel = isUnavailable
    ? 'Out of stock'
    : justAdded
      ? isPreOrder
        ? 'Pre-order added to cart'
        : 'Added to cart'
      : isPreOrder
        ? 'Pre-order'
        : 'Add to cart';

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMessage}
      </div>
      <motion.button
        type="button"
        onClick={onClick}
        disabled={isUnavailable}
        aria-label={ariaLabel}
        whileTap={isUnavailable ? undefined : { scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`${base} ${sizing} ${colours}`}
      >
        {/* Swap the label/icon with a quick scale-fade so "Added!" pops in
            rather than hard-cutting. mode="wait" keeps width stable. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={justAdded ? 'added' : isUnavailable ? 'unavailable' : isPreOrder ? 'preorder' : 'add'}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="inline-flex items-center gap-2"
          >
            {justAdded ? (
              <>
                <CheckIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                Added{variant === 'primary' ? ' to cart' : ''}
              </>
            ) : isUnavailable ? (
              <>
                <ShoppingBagIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {variant === 'compact' ? (
                  <>
                    <span className="sm:hidden">Unavailable</span>
                    <span className="hidden sm:inline">Out of stock</span>
                  </>
                ) : (
                  'Out of stock'
                )}
              </>
            ) : isPreOrder ? (
              <>
                <ClockIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                Pre-order
              </>
            ) : (
              <>
                <ShoppingBagIcon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {variant === 'compact' ? (
                  <>
                    <span className="sm:hidden">Add</span>
                    <span className="hidden sm:inline">Add to cart</span>
                  </>
                ) : (
                  'Add to cart'
                )}
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </motion.button>
    </>
  );
}
