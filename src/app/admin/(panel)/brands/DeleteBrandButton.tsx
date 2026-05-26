'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteBrand } from './actions';

/**
 * Two-step delete: first press deactivates (soft delete — sets is_active=false
 * so the brand vanishes from the storefront but stays available to be
 * reactivated). Shift+click hard-deletes the row entirely. The FK on
 * products.brand_id is ON DELETE SET NULL, so either way products survive.
 */
export default function DeleteBrandButton({
  id,
  name,
  isActive,
}: {
  id: string;
  name: string;
  isActive: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    const hard = e.shiftKey;
    const msg = hard
      ? `Permanently delete "${name}"? This removes the row entirely — any products previously tagged with this brand will become brandless. This cannot be undone.`
      : isActive
        ? `Deactivate "${name}"? It will be hidden from the storefront but stay editable.\n\n(Shift+click to permanently delete instead.)`
        : `Permanently delete "${name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    start(async () => {
      await deleteBrand(id, { hard: hard || !isActive });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
      title="Click to deactivate · Shift+click to permanently delete"
    >
      {pending ? 'Working…' : isActive ? 'Deactivate' : 'Delete'}
    </button>
  );
}
