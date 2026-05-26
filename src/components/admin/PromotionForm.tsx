'use client';

import { useActionState } from 'react';
import { upsertPromotion, type PromotionFormState } from '@/app/admin/(panel)/promotions/actions';
import PromotionImageField from '@/components/admin/PromotionImageField';
import type { Promotion } from '@/types/database';

const initial: PromotionFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';

/**
 * Converts an ISO timestamp from the DB into the local `YYYY-MM-DDTHH:MM`
 * format that `<input type="datetime-local">` expects. Returns '' if null.
 */
function isoToLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PromotionForm({ promotion }: { promotion?: Promotion }) {
  const [state, action, pending] = useActionState(upsertPromotion, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-6">
      {promotion?.id && <input type="hidden" name="id" value={promotion.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-3 font-semibold">Image</h2>
        <PromotionImageField initialUrl={promotion?.image_url ?? null} />
        {err('image_url') && <p className="mt-2 text-xs text-red-600">{err('image_url')}</p>}
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Details</h2>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Title</span>
          <input
            name="title"
            required
            defaultValue={promotion?.title}
            placeholder='e.g. "Labor Day Sale 50% Off"'
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Used as alt text for the image and as the admin label.
          </span>
          {err('title') && <span className="mt-1 block text-xs text-red-600">{err('title')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Link to <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            name="link_url"
            type="text"
            inputMode="url"
            defaultValue={promotion?.link_url ?? ''}
            placeholder="/products/your-slug"
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Where the banner sends visitors when clicked. Use a path like{' '}
            <code>/products/lg-2-door-top-freezer-18cuft</code> or <code>/categories/televisions</code>{' '}
            for internal pages, or a full <code>https://…</code> URL. Leave blank for a display-only banner.
          </span>
          {err('link_url') && (
            <span className="mt-1 block text-xs text-red-600">{err('link_url')}</span>
          )}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Display order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={promotion?.display_order ?? 0}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Lower numbers appear first.
            </span>
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={promotion?.is_featured ?? false}
              className="rounded text-primary-600"
            />
            Featured — takes the large slot on the homepage
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Schedule</h2>
        <p className="text-xs text-gray-600">
          Leave both blank to run indefinitely. The promo is hidden outside the window.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Starts at</span>
            <input
              name="starts_at"
              type="datetime-local"
              defaultValue={isoToLocal(promotion?.starts_at)}
              className={INPUT}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Ends at</span>
            <input
              name="ends_at"
              type="datetime-local"
              defaultValue={isoToLocal(promotion?.ends_at)}
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
            defaultChecked={promotion?.is_active ?? true}
            className="rounded text-primary-600"
          />
          Active — uncheck to hide regardless of the schedule
        </label>
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : promotion ? 'Save changes' : 'Create promotion'}
        </button>
      </div>
    </form>
  );
}
