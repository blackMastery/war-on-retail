'use client';

import { useActionState, useState } from 'react';
import {
  upsertDiscountCode,
  type DiscountFormState,
} from '@/app/admin/(panel)/discounts/actions';
import type { DiscountCode, DiscountType } from '@/types/database';

const initial: DiscountFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';

const TYPE_OPTIONS: { value: DiscountType; label: string; hint: string }[] = [
  { value: 'percentage', label: 'Percentage off', hint: 'e.g. 20 = 20% off the subtotal' },
  { value: 'fixed_amount', label: 'Fixed amount off', hint: 'a flat GYD amount off' },
  { value: 'bogo', label: 'Buy one get one (BOGO)', hint: '% off the cheapest item; needs ≥ 2 items' },
];

/** Auto-generated code: brand prefix `WOR` + a 4-digit number, e.g. WOR6788. */
function generateCode(): string {
  return `WOR${Math.floor(1000 + Math.random() * 9000)}`;
}

/** ISO → local `YYYY-MM-DDTHH:MM` for <input type="datetime-local">. */
function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function DiscountCodeForm({ discount }: { discount?: DiscountCode }) {
  const [state, action, pending] = useActionState(upsertDiscountCode, initial);
  const [type, setType] = useState<DiscountType>(discount?.discount_type ?? 'percentage');
  // New codes auto-fill with WOR####; editing keeps the saved code. Editable.
  const [code, setCode] = useState(discount?.code ?? generateCode());
  const err = (k: string) => state.fieldErrors?.[k];

  const valueLabel =
    type === 'fixed_amount' ? 'Amount off (GYD)' : 'Percentage off (%)';
  const valueHint = TYPE_OPTIONS.find((t) => t.value === type)?.hint ?? '';

  return (
    <form action={action} className="space-y-6">
      {discount?.id && <input type="hidden" name="id" value={discount.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700" role="alert">
          {state.error}
        </div>
      )}

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Code</h2>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Code</span>
          <div className="mt-1 flex gap-2">
            <input
              name="code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. WOR6788"
              className="block w-full rounded-md border-gray-300 font-mono uppercase shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
            />
            {!discount?.id && (
              <button
                type="button"
                onClick={() => setCode(generateCode())}
                className="shrink-0 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Regenerate
              </button>
            )}
          </div>
          <span className="mt-1 block text-xs text-gray-500">
            Auto-generated as <code>WOR####</code> — edit it or regenerate. Case-insensitive at
            checkout; stored upper-cased.
          </span>
          {err('code') && <span className="mt-1 block text-xs text-red-600">{err('code')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Description <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            name="description"
            defaultValue={discount?.description ?? ''}
            placeholder="Shown to the customer when applied, e.g. Summer Sale"
            className={INPUT}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Discount</h2>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">Type</span>
          <select
            name="discount_type"
            value={type}
            onChange={(e) => setType(e.target.value as DiscountType)}
            className={INPUT}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">{valueLabel}</span>
          <div className="relative mt-1">
            {type !== 'fixed_amount' ? null : (
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                GYD $
              </span>
            )}
            <input
              name="discount_value"
              type="number"
              step="0.01"
              min={0}
              max={type === 'fixed_amount' ? undefined : 100}
              required
              defaultValue={discount?.discount_value ?? ''}
              className={`block w-full rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500 ${
                type === 'fixed_amount' ? 'pl-14' : 'pr-8'
              }`}
            />
            {type !== 'fixed_amount' && (
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                %
              </span>
            )}
          </div>
          <span className="mt-1 block text-xs text-gray-500">{valueHint}</span>
          {err('discount_value') && (
            <span className="mt-1 block text-xs text-red-600">{err('discount_value')}</span>
          )}
        </label>
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Limits</h2>
        <p className="text-xs text-gray-600">Leave any field blank for no limit.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Minimum purchase (GYD)</span>
            <input
              name="min_purchase_amount"
              type="number"
              step="0.01"
              min={0}
              defaultValue={discount?.min_purchase_amount ?? ''}
              className={INPUT}
            />
            {err('min_purchase_amount') && (
              <span className="mt-1 block text-xs text-red-600">{err('min_purchase_amount')}</span>
            )}
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Max discount (GYD)</span>
            <input
              name="max_discount_amount"
              type="number"
              step="0.01"
              min={0}
              defaultValue={discount?.max_discount_amount ?? ''}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Caps the savings (handy for % codes).
            </span>
            {err('max_discount_amount') && (
              <span className="mt-1 block text-xs text-red-600">{err('max_discount_amount')}</span>
            )}
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Total usage limit</span>
            <input
              name="usage_limit"
              type="number"
              min={0}
              step={1}
              defaultValue={discount?.usage_limit ?? ''}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-gray-500">Across all customers.</span>
            {err('usage_limit') && (
              <span className="mt-1 block text-xs text-red-600">{err('usage_limit')}</span>
            )}
          </label>

          <label className="block text-sm">
            <span className="font-medium text-gray-700">Per-customer limit</span>
            <input
              name="per_customer_limit"
              type="number"
              min={0}
              step={1}
              defaultValue={discount?.per_customer_limit ?? 1}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-gray-500">
              By phone number. Blank or 0 = unlimited.
            </span>
            {err('per_customer_limit') && (
              <span className="mt-1 block text-xs text-red-600">{err('per_customer_limit')}</span>
            )}
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Schedule</h2>
        <p className="text-xs text-gray-600">
          Leave both blank to run indefinitely. The code is rejected outside the window.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Valid from</span>
            <input
              name="valid_from"
              type="datetime-local"
              defaultValue={isoToLocal(discount?.valid_from)}
              className={INPUT}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Valid until</span>
            <input
              name="valid_until"
              type="datetime-local"
              defaultValue={isoToLocal(discount?.valid_until)}
              className={INPUT}
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={discount?.is_active ?? true}
            className="rounded text-primary-600"
          />
          Active — uncheck to disable regardless of the schedule
        </label>
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : discount ? 'Save changes' : 'Create code'}
        </button>
      </div>
    </form>
  );
}
