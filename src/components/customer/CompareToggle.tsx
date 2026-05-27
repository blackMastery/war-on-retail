'use client';

import { useEffect, useState } from 'react';
import { ScaleIcon } from '@heroicons/react/24/outline';
import {
  COMPARE_MAX,
  useCompareHydrated,
  useCompareStore,
} from '@/lib/compare/store';

type Props = {
  slug: string;
  productName: string;
};

const FEEDBACK_MS = 1500;

/**
 * Toggles a product in/out of the compare list. Matches the visual style of
 * `<WishlistButton>` so the detail-page action row looks consistent.
 *
 * Three states:
 *   - Not in compare → "Compare" outlined
 *   - In compare     → "Comparing" primary-tinted (filled toggle)
 *   - At cap (4)     → button stays clickable for the one in this list, but
 *                       a brief "Limit: 4 products" feedback shows when a
 *                       different product is rejected
 */
export default function CompareToggle({ slug, productName }: Props) {
  const hydrated = useCompareHydrated();
  const isSelected = useCompareStore((s) => s.slugs.includes(slug));
  const count = useCompareStore((s) => s.slugs.length);
  const toggle = useCompareStore((s) => s.toggle);

  const [rejected, setRejected] = useState(false);
  useEffect(() => {
    if (!rejected) return;
    const t = setTimeout(() => setRejected(false), FEEDBACK_MS);
    return () => clearTimeout(t);
  }, [rejected]);

  // Pre-hydration: render the off state so server and client agree.
  const displaySelected = hydrated && isSelected;
  const atCap = hydrated && count >= COMPARE_MAX && !isSelected;

  function onClick() {
    const result = toggle(slug);
    if (result === 'full') setRejected(true);
  }

  const label = rejected
    ? `Compare limit reached — max ${COMPARE_MAX}`
    : displaySelected
      ? `Remove ${productName} from comparison`
      : atCap
        ? `Comparison list full — remove one to add ${productName}`
        : `Add ${productName} to comparison`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={displaySelected}
      title={label}
      className={`inline-flex items-center gap-2 rounded-md border-2 px-6 py-3 font-semibold transition ${
        displaySelected
          ? 'border-primary-600 bg-primary-50 text-primary-700 hover:bg-primary-100'
          : rejected
            ? 'border-orange-400 bg-orange-50 text-orange-800'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <ScaleIcon className="h-5 w-5" aria-hidden="true" />
      {rejected ? `Max ${COMPARE_MAX}` : displaySelected ? 'Comparing' : 'Compare'}
    </button>
  );
}
