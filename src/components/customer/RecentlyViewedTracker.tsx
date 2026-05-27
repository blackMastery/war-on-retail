'use client';

import { useEffect } from 'react';
import { useRecentlyViewedStore } from '@/lib/recently-viewed/store';

/**
 * Headless effect: pushes the given product slug into the recently-viewed
 * store on mount. Dropped into the product detail page so every visit
 * registers in the localStorage list. Renders nothing.
 */
export default function RecentlyViewedTracker({ slug }: { slug: string }) {
  const push = useRecentlyViewedStore((s) => s.push);
  useEffect(() => {
    push(slug);
  }, [slug, push]);
  return null;
}
