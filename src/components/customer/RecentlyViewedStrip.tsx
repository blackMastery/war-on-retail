'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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

  // Cache fetched products by slug so navigating between pages doesn't refetch.
  const [products, setProducts] = useState<Product[] | null>(null);
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    if (!hydrated || slugsToShow.length < minItems) {
      setProducts(null);
      return;
    }
    const key = slugsToShow.join(',');
    if (key === lastQueryRef.current) return;
    lastQueryRef.current = key;

    let cancelled = false;
    fetch(`/api/products/by-slugs?slugs=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((data: { products?: Product[] }) => {
        if (cancelled) return;
        setProducts(data.products ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, slugsToShow, minItems]);

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
