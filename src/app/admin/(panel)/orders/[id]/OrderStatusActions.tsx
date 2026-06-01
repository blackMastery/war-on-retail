'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveOrder, cancelOrder, fulfillOrder } from '../actions';
import type { OrderStatus } from '@/types/database';

/**
 * Status-transition buttons gated by the legal-transition map.
 *
 * The server actions re-check the transition before applying, so even a
 * stale client can't move an order into an illegal state — these buttons
 * just hide the obviously-unreachable choices for cleanliness.
 */
export default function OrderStatusActions({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  async function run(action: () => Promise<void>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return;
    start(async () => {
      try {
        await action();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Action failed.');
      }
    });
  }

  if (status === 'fulfilled' || status === 'cancelled') {
    return (
      <div className="rounded-lg bg-white p-5 text-sm text-gray-600 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold text-gray-900">Order closed</h2>
        <p className="mt-1">
          {status === 'fulfilled'
            ? 'This order has been fulfilled. No further actions available.'
            : 'This order was cancelled and stock has been restored.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="font-semibold">Actions</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {status === 'pending' && (
          <button
            type="button"
            onClick={() =>
              run(
                () => approveOrder(orderId),
                'Approve this order? The customer will expect a follow-up call to confirm payment + delivery.',
              )
            }
            disabled={pending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            ✓ Approve
          </button>
        )}
        {status === 'approved' && (
          <button
            type="button"
            onClick={() =>
              run(
                () => fulfillOrder(orderId),
                'Mark this order as fulfilled? Use this when the customer has received the goods.',
              )
            }
            disabled={pending}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-60"
          >
            ✓ Mark as fulfilled
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            run(
              () => cancelOrder(orderId),
              'Cancel this order? Stock for all items will be restored. This cannot be undone.',
            )
          }
          disabled={pending}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          ✕ Cancel order
        </button>
      </div>
    </div>
  );
}
