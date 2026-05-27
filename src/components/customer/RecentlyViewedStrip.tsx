'use client';

import { useEffect, useMemo, useState } from 'react';
import HorizontalScroller from './HorizontalScroller';
import ProductCard from './ProductCard';
import {
  useRecentlyViewedHydrated,
  useRecentlyViewedStore,
} from '@/lib/recently-viewed/store';
import type { Product } from '@/types/database';

type Props = {
  /** Slug to exclude — used on the product detail page so we don't render
   *  the product the visitor is currently looking at. */
  excludeSlug?: string;
  /** Section heading. */
  title?: string;
  /** Min items required to render the strip (e.g. 2 on the homepage). */
  minItems?: number;
};

/**
 * Renders the "Recently viewed" horizontal strip. Reads slugs from the
 * localStorage-backed store, fetches the corresponding products from
 * `/api/products/by-slugs`, and feeds them into `<HorizontalScroller>` + `<ProductCard>`.
 *
 * Renders nothing (returns `null`) when:
 *   - The store hasn't hydrated yet (avoids SSR/hydration mismatch)
 *   - There are fewer than `minItems` slugs after excluding the current one
 *   - The API returns no matching active products
 */
export default function RecentlyViewedStrip({
  excludeSlug,
  title = 'Recently Viewed',
  minItems = 1,
}: Props) {
  const hydrated = useRecentlyViewedHydrated();
  const allSlugs = useRecentlyViewedStore((s) => s.slugs);

  const slugsToShow = useMemo(
    () => (excludeSlug ? allSlugs.filter((s) => s !== excludeSlug) : allSlugs),
    [allSlugs, excludeSlug],
  );

  const [products, setProducts] = useState<Product[] | null>(null);

  // Joined-string dep, plus `AbortController` for cancellation. The previous
  // `lastQueryRef` dedupe was broken under React Strict Mode: the first
  // mount-time effect would set the ref + start a fetch, cleanup would cancel
  // it, then the second mount-time effect would see the ref match and bail
  // out — leaving us with a permanently-cancelled fetch and a stuck skeleton.
  const slugsKey = slugsToShow.join(',');

  useEffect(() => {
    if (!hydrated || slugsToShow.length < minItems) {
      setProducts(null);
      return;
    }

    const controller = new AbortController();
    fetch(`/api/products/by-slugs?slugs=${encodeURIComponent(slugsKey)}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        setProducts(data.products ?? []);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setProducts([]);
      });

    return () => controller.abort();
    // `slugsToShow.length` is captured in `slugsKey`; including it would be
    // redundant. `minItems` is a constant the parent passes — including it
    // covers the (unlikely) case of the parent re-rendering with a different
    // threshold.
  }, [hydrated, slugsKey, slugsToShow.length, minItems]);

  if (!hydrated) return null;
  if (slugsToShow.length < minItems) return null;
  if (products == null) return null; // loading; avoid layout flash
  if (products.length < minItems) return null;

  return (
    <section className="container py-12" aria-label={title}>
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">{title}</h2>
      </div>
      <HorizontalScroller ariaLabel={title} gap={4}>
        {products.map((p) => (
          <div key={p.id} className="w-60 shrink-0 snap-start sm:w-64">
            <ProductCard product={p} />
          </div>
        ))}
      </HorizontalScroller>
    </section>
  );
}
