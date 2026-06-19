'use client';

import { useActionState } from 'react';
import {
  upsertPaymentMethod,
  type PaymentMethodFormState,
} from '@/app/admin/(panel)/payment-methods/actions';
import type { PaymentMethod } from '@/types/database';

const initial: PaymentMethodFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

export default function PaymentMethodForm({ method }: { method?: PaymentMethod }) {
  const [state, action, pending] = useActionState(upsertPaymentMethod, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-6">
      {method?.id && <input type="hidden" name="id" value={method.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <section className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">Basics</h2>
        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Name</span>
          <input
            name="name"
            required
            defaultValue={method?.name}
            placeholder="e.g. Mobile Money (MMG)"
            className={INPUT}
          />
          {err('name') && <span className="mt-1 block text-xs text-red-600">{err('name')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">
            Description <span className="font-normal text-muted-foreground">(shown to customers)</span>
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={method?.description ?? ''}
            placeholder="Short explanation of how this payment works — appears in Step 3 of checkout."
            className={INPUT}
          />
        </label>
      </section>

      <section className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-secondary-foreground">Display order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={method?.display_order ?? 0}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-muted-foreground">
              Lower numbers appear first in checkout.
            </span>
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={method?.is_active ?? true}
              className="rounded text-primary"
            />
            Active (shown to customers at checkout)
          </label>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : method ? 'Save changes' : 'Create payment method'}
        </button>
      </div>
    </form>
  );
}
