'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

type Props = {
  children: React.ReactNode;
  /** Accessible label for the scroll region (e.g. "Categories"). */
  ariaLabel: string;
  /** Gap between items. Maps to the Tailwind `gap-*` token. Default 3 (0.75rem). */
  gap?: 2 | 3 | 4 | 6;
};

/**
 * A horizontal scroll region that:
 *   - Snaps each child to the start (`snap-x snap-mandatory`)
 *   - Hides the native scrollbar (see `.no-scrollbar` in globals.css)
 *   - Shows prev/next chevron buttons on the sides — but only when there's
 *     actual overflow in that direction. On mobile / touch, the buttons stay
 *     hidden and the user just swipes.
 *   - Reveals a soft edge-fade at the side(s) where more content exists,
 *     hinting "scroll for more" without taking up extra space.
 *
 * Pass children as fixed-width tiles — e.g. `<div className="w-40 shrink-0 snap-start">…</div>`
 * — so they line up cleanly.
 */
export default function HorizontalScroller({ children, ariaLabel, gap = 3 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Recompute the "can scroll …" state. Called on scroll, resize, and after
  // mount once the children have laid out.
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 1);
    // -1 buffer for sub-pixel rounding so the right arrow doesn't flicker.
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // Children may load async (next/image dimensions etc.). Re-check via
    // ResizeObserver so the buttons appear once layout settles.
    const ro = 'ResizeObserver' in window ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);

    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      ro?.disconnect();
    };
  }, [update]);

  function scroll(direction: -1 | 1) {
    const el = ref.current;
    if (!el) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    // 85% of viewport so a chunk of the next item peeks out — easier to track.
    el.scrollBy({
      left: el.clientWidth * 0.85 * direction,
      behavior: prefersReduced ? 'auto' : 'smooth',
    });
  }

  const gapClass = { 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6' }[gap];

  return (
    <div className="relative" role="region" aria-label={ariaLabel}>
      <div
        ref={ref}
        className={`no-scrollbar flex items-stretch ${gapClass} snap-x snap-mandatory scroll-pl-1 overflow-x-auto scroll-smooth`}
      >
        {children}
      </div>

      {/* Edge fades — quietly hint that more content exists. Always mounted and
          toggled via opacity so they cross-fade as you scroll rather than
          popping in/out. */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-accent-500 to-transparent transition-opacity duration-200 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-accent-500 to-transparent transition-opacity duration-200 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Desktop nav buttons. Hidden on touch screens where swipe is natural. */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        disabled={!canScrollLeft}
        aria-label={`Scroll ${ariaLabel} left`}
        className={`absolute left-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-0 md:flex`}
      >
        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        disabled={!canScrollRight}
        aria-label={`Scroll ${ariaLabel} right`}
        className={`absolute right-1 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:bg-gray-50 disabled:pointer-events-none disabled:opacity-0 md:flex`}
      >
        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
