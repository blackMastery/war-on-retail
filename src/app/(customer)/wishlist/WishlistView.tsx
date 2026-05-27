'use client';

import { useEffect, useRef, useState } from 'react';
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
  const lastQueryRef = useRef<string>('');

  useEffect(() => {
    if (!hydrated) {
      setProducts(null);
      return;
    }
    if (slugs.length === 0) {
      setProducts([]);
      lastQueryRef.current = '';
      return;
    }
    const key = slugs.join(',');
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
  }, [hydrated, slugs]);

  if (!hydrated || products == null) {
    return (
      <div className="mt-6 grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] rounded-lg bg-gray-100" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mt-6 rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
        <p className="text-lg font-semibold text-gray-900">Nothing saved yet</p>
        <p className="mt-1 text-sm text-gray-600">
          Tap the heart on any product to add it to your wishlist.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-block rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700"
        >
          Browse products
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <p className="tabular-nums">
          {products.length} {products.length === 1 ? 'item' : 'items'}
        </p>
        <button
          type="button"
          onClick={() => {
            if (confirm('Remove all items from your wishlist?')) clear();
          }}
          className="font-medium text-gray-500 hover:text-red-600 hover:underline"
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
