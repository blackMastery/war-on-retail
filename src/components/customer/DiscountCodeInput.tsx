'use client';

import { useCallback, useState } from 'react';
import { CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { useCartStore } from '@/lib/cart/store';
import { formatPrice, getOrCreateSessionId } from '@/lib/utils';
import type { AppliedDiscount } from '@/types/discount';

/**
 * Cart-side discount code entry. Posts the live cart to
 * `/api/discounts/validate`; on success it stores the applied discount in the
 * cart store (which the summary reads to show the savings + new total) and
 * renders a green confirmation with a Remove button.
 *
 * The cart store clears any applied discount whenever the cart contents change,
 * so a stale amount can't survive a quantity edit — the customer just re-applies.
 */
export default function DiscountCodeInput() {
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.items.reduce((sum, i) => sum + i.price * i.quantity, 0));
  const applied = useCartStore((s) => s.appliedDiscount);
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clearDiscount = useCartStore((s) => s.clearDiscount);

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const apply = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = code.trim();
      if (!trimmed || pending) return;

      setPending(true);
      setError(null);
      try {
        const res = await fetch('/api/discounts/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: trimmed,
            subtotal,
            productIds: items.map((i) => i.productId),
            items: items.map((i) => ({
              productId: i.productId,
              price: i.price,
              quantity: i.quantity,
            })),
            sessionId: getOrCreateSessionId(),
          }),
        });
        const data: { discount?: AppliedDiscount; error?: string } = await res.json();
        if (!res.ok || !data.discount) {
          setError(data.error ?? 'Could not apply that code.');
          return;
        }
        setDiscount(data.discount);
        setCode('');
      } catch {
        setError('Network error — please try again.');
      } finally {
        setPending(false);
      }
    },
    [code, pending, subtotal, items, setDiscount],
  );

  if (applied) {
    return (
      <div
        className="flex items-start justify-between gap-3 rounded-md bg-green-50 p-3 ring-1 ring-green-200"
        role="status"
        aria-live="polite"
      >
        <div className="flex min-w-0 items-start gap-2">
          <CheckCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-green-600" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-green-800">
              Code <span className="font-mono uppercase">{applied.code}</span> applied
            </p>
            <p className="text-xs text-green-700">
              You’re saving {formatPrice(applied.amountDiscounted)}
              {applied.description ? ` · ${applied.description}` : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => clearDiscount()}
          aria-label={`Remove discount code ${applied.code}`}
          className="shrink-0 rounded-full p-1 text-green-700 hover:bg-green-100"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="space-y-2" noValidate>
      <label htmlFor="discount-code" className="block text-sm font-medium text-gray-700">
        Discount code
      </label>
      <div className="flex gap-2">
        <input
          id="discount-code"
          name="discount-code"
          type="text"
          autoCapitalize="characters"
          autoComplete="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          placeholder="e.g. SUMMER20"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'discount-code-error' : undefined}
          className="block w-full rounded-md border-gray-300 text-sm uppercase shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <button
          type="submit"
          disabled={pending || !code.trim()}
          className="shrink-0 rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {pending ? 'Applying…' : 'Apply'}
        </button>
      </div>
      {error && (
        <p id="discount-code-error" className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
