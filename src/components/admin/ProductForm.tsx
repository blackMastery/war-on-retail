'use client';

import { useActionState } from 'react';
import { upsertProduct, type ProductFormState } from '@/app/admin/(panel)/products/actions';
import ProductImagesField from '@/components/admin/ProductImagesField';
import type { Brand, Category, Product } from '@/types/database';

type Props = {
  product?: Product;
  categories: Category[];
  brands: Brand[];
};

const initial: ProductFormState = {};

// Shared input styling. (Can't use `@apply` at runtime — must be real Tailwind classes.)
const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';

export default function ProductForm({ product, categories, brands }: Props) {
  const [state, action, pending] = useActionState(upsertProduct, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <form action={action} className="space-y-6">
      {product?.id && <input type="hidden" name="id" value={product.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <Section title="Basics">
        <Field label="Name" error={err('name')}>
          <input
            name="name"
            defaultValue={product?.name}
            required
            className={INPUT}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Slug (optional)" hint="Auto-generated from name if blank">
            <input name="slug" defaultValue={product?.slug} className={INPUT} />
          </Field>
          <Field label="SKU">
            <input name="sku" defaultValue={product?.sku ?? ''} className={INPUT} />
          </Field>
        </div>
        <Field label="Short description">
          <input
            name="short_description"
            defaultValue={product?.short_description ?? ''}
            className={INPUT}
          />
        </Field>
        <Field label="Description">
          <textarea
            name="description"
            defaultValue={product?.description ?? ''}
            rows={5}
            className={INPUT}
          />
        </Field>
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Price (GYD)" error={err('price')}>
            <input
              name="price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.price}
              required
              className={INPUT}
            />
          </Field>
          <Field label="Compare-at price">
            <input
              name="compare_at_price"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.compare_at_price ?? ''}
              className={INPUT}
            />
          </Field>
          <Field label="Cost">
            <input
              name="cost"
              type="number"
              step="0.01"
              min="0"
              defaultValue={product?.cost ?? ''}
              className={INPUT}
            />
          </Field>
        </div>
      </Section>

      <Section title="Inventory">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Stock quantity">
            <input
              name="stock_quantity"
              type="number"
              min="0"
              defaultValue={product?.stock_quantity ?? 0}
              className={INPUT}
            />
          </Field>
          <Field label="Low-stock threshold">
            <input
              name="low_stock_threshold"
              type="number"
              min="0"
              defaultValue={product?.low_stock_threshold ?? 5}
              className={INPUT}
            />
          </Field>
          <label className="flex items-center gap-2 pt-7 text-sm">
            <input
              type="checkbox"
              name="track_inventory"
              defaultChecked={product?.track_inventory ?? true}
              className="rounded text-primary-600"
            />
            Track inventory
          </label>
        </div>
      </Section>

      <Section title="Classification">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              name="category_id"
              defaultValue={product?.category_id ?? ''}
              className={INPUT}
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <select name="brand_id" defaultValue={product?.brand_id ?? ''} className={INPUT}>
              <option value="">— None —</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section title="Images">
        <p className="text-xs text-gray-600">
          Upload as many images as you want. Pick one as the featured image — it’s the one that
          shows on product cards and as the hero on the product page. Files upload directly to the{' '}
          <code>product-images</code> Supabase Storage bucket.
        </p>
        <ProductImagesField
          initialFeaturedUrl={product?.featured_image_url ?? null}
          initialUrls={product?.image_urls ?? []}
        />
      </Section>

      <Section title="Specifications">
        <Field
          label="Specifications JSON"
          hint='Free-form. Example: {"screen_size":"55","resolution":"4K"}'
        >
          <textarea
            name="specifications_json"
            rows={4}
            defaultValue={
              product?.specifications ? JSON.stringify(product.specifications, null, 2) : '{}'
            }
            className={`${INPUT} font-mono text-xs`}
          />
        </Field>
      </Section>

      <Section title="Status">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="rounded text-primary-600"
            />
            Active (visible in storefront)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured ?? false}
              className="rounded text-primary-600"
            />
            Featured (homepage)
          </label>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-2 border-t border-gray-200 pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary-600 px-5 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
      </div>

    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="mb-3 font-semibold">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
