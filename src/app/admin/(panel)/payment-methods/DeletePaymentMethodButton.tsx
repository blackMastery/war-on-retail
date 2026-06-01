'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePaymentMethod } from './actions';

/**
 * Two-step delete: first press soft-disables (`is_active=false`). Shift+click
 * hard-deletes. Hard-delete is rejected by Postgres if any orders reference
 * the method (FK `on delete restrict`); the action surfaces a friendly error.
 */
export default function DeletePaymentMethodButton({
  id,
  name,
  isActive,
  usedByOrders,
}: {
  id: string;
  name: string;
  isActive: boolean;
  usedByOrders: number;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick(e: React.MouseEvent) {
    const hard = e.shiftKey;
    if (hard && usedByOrders > 0) {
      alert(
        `"${name}" is referenced by ${usedByOrders} order(s) and cannot be hard-deleted. Hide it instead — orders keep their reference and customers no longer see it at checkout.`,
      );
      return;
    }
    const msg = hard
      ? `Permanently delete "${name}"? This cannot be undone.`
      : isActive
        ? `Hide "${name}"? Customers won't see it at checkout, but past orders keep their reference.\n\n(Shift+click to permanently delete instead.)`
        : `Permanently delete "${name}"? This cannot be undone.`;
    if (!confirm(msg)) return;
    start(async () => {
      try {
        await deletePaymentMethod(id, { hard: hard || !isActive });
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Could not delete payment method.');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
      title="Click to hide · Shift+click to permanently delete"
    >
      {pending ? 'Working…' : isActive ? 'Hide' : 'Delete'}
    </button>
  );
}
