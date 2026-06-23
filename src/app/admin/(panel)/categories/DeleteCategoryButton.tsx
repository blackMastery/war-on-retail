'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCategory } from './actions';

/**
 * Two-step delete: first press deactivates. Shift+click hard-deletes.
 * FKs on products.category_id and categories.parent_id are ON DELETE SET NULL,
 * so hard-deleting leaves products uncategorised and children orphaned (which
 * makes them top-level on the next render).
 */
export default function DeleteCategoryButton({
  id,
  name,
  isActive,
  childCount,
  productCount,
}: {
  id: string;
  name: string;
  isActive: boolean;
  childCount: number;
  productCount: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    const hard = e.shiftKey;
    const consequences: string[] = [];
    if (productCount > 0) {
      consequences.push(
        `· ${productCount} product${productCount === 1 ? '' : 's'} will become uncategorised`,
      );
    }
    if (childCount > 0) {
      consequences.push(
        `· ${childCount} sub-categor${childCount === 1 ? 'y' : 'ies'} will become top-level`,
      );
    }
    const consequenceLines = consequences.length ? `\n\n${consequences.join('\n')}` : '';

    const msg = hard
      ? `Permanently delete "${name}"? This cannot be undone.${consequenceLines}`
      : isActive
        ? `Deactivate "${name}"? It will be hidden from the storefront but stay editable.${consequenceLines}\n\n(Shift+click to permanently delete instead.)`
        : `Permanently delete "${name}"?${consequenceLines}\n\nThis cannot be undone.`;
    if (!confirm(msg)) return;
    start(async () => {
      await deleteCategory(id, { hard: hard || !isActive });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      title="Click to deactivate · Shift+click to permanently delete"
    >
      {pending ? 'Working…' : isActive ? 'Deactivate' : 'Delete'}
    </button>
  );
}
