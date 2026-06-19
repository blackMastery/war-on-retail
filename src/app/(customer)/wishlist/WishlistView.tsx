'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/customer/ProductCard';
import { useWishlistHydrated, useWishlistStore } from '@/lib/wishlist/store';
import type { Product } from '@/types/database';

/**
 * Renders the wishlist as a grid. Three states:
 *   - Not hydrated → skeleton
 *   - Hydrated + empty → empty-state CTA
 *   - Hydrated + has items → grid + clear-all action
 *
 * Products are fetched from `/api/products/by-slugs` which preserves the
 * caller-provided order (most-recently-added first).
 *
 * Stale items: if a product was deleted server-side after being saved, the API
 * just won't return it — the wishlist quietly drops the gap. No error UI
 * needed; we surface the count of "still-available" items in the heading.
 */
export default function WishlistView() {
  const hydrated = useWishlistHydrated();
  const slugs = useWishlistStore((s) => s.slugs);
  const clear = useWishlistStore((s) => s.clear);

  const [products, setProducts] = useState<Product[] | null>(null);

  // Dep is the joined-string form of `slugs`, not the array reference, so
  // identical contents never trigger a redundant refetch. Identical-by-string
  // also means Strict Mode's mount-time double-invoke produces the same dep
  // value both times — but unlike the old `lastQueryRef` dedupe, we now use
  // `AbortController` to cancel the first in-flight fetch and let the second
  // setup actually start a fresh one. Previously the second setup would see a
  // matching ref, bail out, and we'd be left with a permanently-cancelled
  // fetch and a null state.
  const slugsKey = slugs.join(',');

  useEffect(() => {
    if (!hydrated) {
      setProducts(null);
      return;
    }
    if (!slugsKey) {
      setProducts([]);
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
        // AbortError is expected when the effect re-runs / unmounts; ignore.
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setProducts([]);
      });

    return () => controller.abort();
  }, [hydrated, slugsKey]);

  if (!hydrated || products == null) {
    return (
      <div className="mt-6 grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="text-lg font-semibold text-foreground">Nothing saved yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap the heart on any product to add it to your wishlist.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p className="tabular-nums">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm('Remove all items from your wishlist?')) clear();
          }}
          className="font-medium text-muted-foreground hover:text-red-600 hover:underline"
        >
          Clear wishlist
        </button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
