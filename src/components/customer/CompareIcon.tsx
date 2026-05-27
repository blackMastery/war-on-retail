'use client';

import Link from 'next/link';
import { ScaleIcon } from '@heroicons/react/24/outline';
import {
  buildCompareUrl,
  selectCompareCount,
  useCompareHydrated,
  useCompareStore,
} from '@/lib/compare/store';

/**
 * Header compare icon with item-count badge. Links to `/compare?slugs=…`
 * built from the current store contents — clicking always goes somewhere
 * sensible (empty compare page if 0 items, full table if 2+).
 *
 * Hidden until the store has hydrated to avoid the SSR-says-0 flicker.
 */
export default function CompareIcon() {
  const slugs = useCompareStore((s) => s.slugs);
  const count = useCompareStore(selectCompareCount);
  const hydrated = useCompareHydrated();
  const showBadge = hydrated && count > 0;

  return (
    <Link
      href={buildCompareUrl(slugs)}
      aria-label={
        hydrated
          ? count === 0
            ? 'Compare list is empty'
            : `Compare list, ${count} ${count === 1 ? 'item' : 'items'}`
          : 'Compare'
      }
      className="relative inline-flex items-center justify-center rounded-full p-2 hover:bg-gray-100"
    >
      <ScaleIcon className="h-6 w-6" aria-hidden="true" />
      {showBadge && (
        <span
          aria-hidden="true"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white tabular-nums"
        >
          {count}
        </span>
      )}
    </Link>
  );
}
