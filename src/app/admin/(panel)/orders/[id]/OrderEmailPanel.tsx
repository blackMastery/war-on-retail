'use client';

import { useActionState } from 'react';
import {
  setCustomerEmail,
  sendOrderEmailManual,
  type OrderEmailState,
} from '../actions';

const initial: OrderEmailState = {};

const SEND_OPTIONS: { slug: string; label: string }[] = [
  { slug: 'order_confirmation', label: 'Order confirmation' },
  { slug: 'order_approved', label: 'Order approved' },
  { slug: 'order_fulfilled', label: 'Order fulfilled' },
  { slug: 'order_cancelled', label: 'Order cancelled' },
];

const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500';

/**
 * Order-screen email controls. Two jobs:
 *   1. Capture/clear the customer's email (the only place email enters — checkout
 *      is phone-only).
 *   2. Manually (re)send a system order email to that address. Auto-emails fire
 *      on status change too, but this lets an admin send on demand.
 */
export default function OrderEmailPanel({
  customerId,
  orderId,
  currentEmail,
}: {
  customerId: string;
  orderId: string;
  currentEmail: string | null;
}) {
  const [emailState, emailAction, emailPending] = useActionState(setCustomerEmail, initial);
  const [sendState, sendAction, sendPending] = useActionState(sendOrderEmailManual, initial);

  return (
    <div className="mt-6 border-t border-gray-200 pt-4">
      <h2 className="font-semibold">Email</h2>

      <form action={emailAction} className="mt-2">
        <input type="hidden" name="customer_id" value={customerId} />
        <input type="hidden" name="order_id" value={orderId} />
        <label className="block text-sm">
          <span className="text-xs uppercase tracking-wide text-gray-500">Customer email</span>
          <input
            name="email"
            type="email"
            defaultValue={currentEmail ?? ''}
            placeholder="not set — add to enable email receipts"
            className={INPUT}
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={emailPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {emailPending ? 'Saving…' : 'Save email'}
          </button>
          {emailState.ok && <span className="text-xs text-green-700">{emailState.ok}</span>}
          {emailState.error && <span className="text-xs text-red-600">{emailState.error}</span>}
        </div>
      </form>

      <form action={sendAction} className="mt-4 space-y-2">
        <input type="hidden" name="order_id" value={orderId} />
        <span className="text-xs uppercase tracking-wide text-gray-500">Send an email</span>
        {!currentEmail && (
          <p className="text-xs text-amber-700">Add an email above first to send.</p>
        )}
        <div className="flex items-center gap-2">
          <select name="slug" defaultValue="order_confirmation" className={`${INPUT} mt-0 flex-1`}>
            {SEND_OPTIONS.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={sendPending || !currentEmail}
            className="rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {sendPending ? 'Sending…' : 'Send'}
          </button>
        </div>
        {sendState.ok && <p className="text-xs text-green-700">{sendState.ok}</p>}
        {sendState.error && <p className="text-xs text-red-600">{sendState.error}</p>}
      </form>
    </div>
  );
}
