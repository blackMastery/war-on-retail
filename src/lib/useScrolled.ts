'use client';

import { useEffect, useState } from 'react';

/**
 * Returns true once the window has scrolled past `threshold` px. Used to give
 * the sticky header a touch more elevation on long pages.
 *
 * Passive scroll listener; reads `scrollY` once on mount so it's correct after
 * a refresh mid-page. Cheap — a single boolean state that only flips at the
 * threshold crossing.
 */
export function useScrolled(threshold = 8): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [threshold]);

  return scrolled;
}
