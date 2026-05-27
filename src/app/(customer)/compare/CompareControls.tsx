'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { TrashIcon } from '@heroicons/react/24/outline';
import { useCompareStore } from '@/lib/compare/store';

/**
 * Tiny toolbar above the comparison table — lets the visitor:
 *   - Sync the URL `?slugs=…` selection back into the persisted store
 *     (handy if they landed here from a shared link and want to keep editing)
 *   - Clear the whole comparison
 *
 * The page itself is a server component (so it can SSR the table from the
 * URL), but the store lives on the client; this is the only client-side
 * piece needed.
 */
export default function CompareControls() {
  const router = useRouter();
  const search = useSearchParams();
  const setStore = useCompareStore.setState;
  const clear = useCompareStore((s) => s.clear);
  const [pending, start] = useTransition();

  const urlSlugs = (search.get('slugs') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  function clearAll() {
    if (!confirm('Clear all products from comparison?')) return;
    clear();
    start(() => {
      router.replace('/compare');
    });
  }

  function syncToStore() {
    setStore({ slugs: urlSlugs });
  }

  return (
    <div className="mb-4 flex flex-wrap items-center justify-end gap-3 text-sm">
      <button
        type="button"
        onClick={syncToStore}
        className="text-gray-600 hover:text-primary-600 hover:underline"
        title="Save this selection so the header compare icon shows the same items"
      >
        Save this selection
      </button>
      <button
        type="button"
        onClick={clearAll}
        disabled={pending}
        className="inline-flex items-center gap-1 font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" aria-hidden="true" />
        Clear comparison
      </button>
    </div>
  );
}
