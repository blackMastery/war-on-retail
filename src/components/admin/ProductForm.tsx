'use client';

import { useActionState } from 'react';
import { upsertProduct, type ProductFormState } from '@/app/admin/(panel)/products/actions';
import ProductImagesField from '@/components/admin/ProductImagesField';
import SeoMetaFields from '@/components/admin/SeoMetaFields';
import SpecificationsField from '@/components/admin/SpecificationsField';
import type { Brand, Category, Product } from '@/types/database';

type Props = {
  product?: Product;
  categories: Category[];
  brands: Brand[];
};

const initial: ProductFormState = {};

// Shared input styling. (Can't use `@apply` at runtime — must be real Tailwind classes.)
const INPUT =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

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
              className="rounded text-primary"
            />
            Track inventory
          </label>
        </div>
      </Section>

      <Section title="Pre-orders">
        <p className="text-xs text-muted-foreground">
          When ticked, customers can still buy this product after stock runs
          out — the order line is flagged as a pre-order and admins
          reconcile inventory manually when shipping.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_pre_order_enabled"
            defaultChecked={product?.is_pre_order_enabled ?? false}
            className="rounded text-primary"
          />
          Allow pre-orders when out of stock
        </label>
        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">
            Pre-order message <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <textarea
            name="pre_order_message"
            rows={2}
            defaultValue={product?.pre_order_message ?? ''}
            placeholder="e.g. Ships within 3–4 weeks. Confirmed by our team."
            className="mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Shown next to the customer&apos;s Pre-order CTA when the product is
            out of stock. Leave blank to use a generic line.
          </span>
        </label>
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
        <p className="text-xs text-muted-foreground">
          Upload as many images as you want. Pick one as the featured image — it’s the one that
          shows on product cards and as the hero on the product page. Files upload directly to the{' '}
          <code>product-images</code> Supabase Storage bucket.
        </p>
        <ProductImagesField
          initialFeaturedUrl={product?.featured_image_url ?? null}
          initialUrls={product?.image_urls ?? []}
          initialImageMeta={product?.image_meta ?? {}}
          initialFeaturedAlt={product?.featured_image_alt ?? null}
        />
      </Section>

      <Section title="Specifications">
        <p className="mb-3 text-xs text-muted-foreground">
          Technical details shown in the product page’s spec table. One row per attribute — the
          name on the left is the label customers see, the value on the right is what shows next
          to it.
        </p>
        <SpecificationsField
          initial={(product?.specifications ?? {}) as Record<string, unknown>}
        />
      </Section>

      <Section title="SEO">
        <p className="text-xs text-muted-foreground">
          Optional. When blank, the product page builds these automatically
          from brand + name and the short / long description.
        </p>
        <SeoMetaFields
          defaultValues={{
            meta_title: product?.meta_title,
            meta_description: product?.meta_description,
            meta_keywords: product?.meta_keywords,
          }}
          fieldErrors={state.fieldErrors}
          fallback={{
            title: product?.name ? `${product.name} · War on Retail` : undefined,
            description:
              product?.short_description ?? product?.description ?? undefined,
          }}
        />
      </Section>

      <Section title="Status">
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={product?.is_active ?? true}
              className="rounded text-primary"
            />
            Active (visible in storefront)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_featured"
              defaultChecked={product?.is_featured ?? false}
              className="rounded text-primary"
            />
            Featured (homepage)
          </label>
        </div>
      </Section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : product ? 'Save changes' : 'Create product'}
        </button>
      </div>

    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
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
      <span className="font-medium text-secondary-foreground">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-600">{error}</span>}
    </label>
  );
}
