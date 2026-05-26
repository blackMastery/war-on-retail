'use client';

import { useActionState } from 'react';
import { upsertBrand, type BrandFormState } from '@/app/admin/(panel)/brands/actions';
import BrandLogoField from '@/components/admin/BrandLogoField';
import type { Brand } from '@/types/database';

const initial: BrandFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';

export default function BrandForm({ brand }: { brand?: Brand }) {
  const [state, action, pending] = useActionState(upsertBrand, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-6">
      {brand?.id && <input type="hidden" name="id" value={brand.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Basics</h2>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Name</span>
          <input
            name="name"
            required
            defaultValue={brand?.name}
            placeholder="e.g. Samsung"
            className={INPUT}
          />
          {err('name') && <span className="mt-1 block text-xs text-red-600">{err('name')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Slug <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            name="slug"
            defaultValue={brand?.slug ?? ''}
            placeholder="auto-generated from name"
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-gray-500">
            Used in the URL: <code>/brands/your-slug</code>. Leave blank to derive from the name.
          </span>
          {err('slug') && <span className="mt-1 block text-xs text-red-600">{err('slug')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Description <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <textarea
            name="description"
            rows={3}
            defaultValue={brand?.description ?? ''}
            placeholder="A short paragraph shown on the brand landing page."
            className={INPUT}
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-gray-700">
            Website <span className="font-normal text-gray-500">(optional)</span>
          </span>
          <input
            name="website_url"
            type="url"
            inputMode="url"
            defaultValue={brand?.website_url ?? ''}
            placeholder="https://samsung.com"
            className={INPUT}
          />
          {err('website_url') && (
            <span className="mt-1 block text-xs text-red-600">{err('website_url')}</span>
          )}
        </label>
      </section>

      <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="mb-3 font-semibold">Logo</h2>
        <BrandLogoField initialUrl={brand?.logo_url ?? null} />
      </section>

      <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Status</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-gray-700">Display order</span>
            <input
              name="display_order"
              type="number"
              defaultValue={brand?.display_order ?? 0}
              className={INPUT}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Lower numbers appear first.
            </span>
          </label>
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={brand?.is_active ?? true}
              className="rounded text-primary-600"
            />
            Active (visible in storefront)
          </label>
        </div>
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : brand ? 'Save changes' : 'Create brand'}
        </button>
      </div>
    </form>
  );
}
