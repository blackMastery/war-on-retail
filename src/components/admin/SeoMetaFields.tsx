'use client';

/**
 * Shared "SEO" form section reused by ProductForm / CategoryForm / BrandForm.
 *
 * Three inputs — meta_title, meta_description, meta_keywords — each backed by
 * a string column that the customer-facing `generateMetadata` consumes. When
 * the admin clears a field, the upsert helpers coerce the empty string to
 * NULL so the public page falls back to its compile-time default.
 *
 * The styling is intentionally minimal so each parent form can decide
 * whether to wrap this in a card section.
 */
export default function SeoMetaFields({
  defaultValues,
  fieldErrors,
  /** What the customer-facing generateMetadata uses when these fields are blank.
   *  Shown as the placeholder so admins see what they're overriding. */
  fallback,
}: {
  defaultValues?: {
    meta_title?: string | null;
    meta_description?: string | null;
    meta_keywords?: string | null;
  };
  fieldErrors?: Record<string, string>;
  fallback?: { title?: string; description?: string };
}) {
  const INPUT =
    'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';
  const err = (k: string) => fieldErrors?.[k];
  return (
    <div className="space-y-4">
      <label className="block text-sm">
        <span className="font-medium text-gray-700">
          Meta title <span className="font-normal text-gray-500">(optional)</span>
        </span>
        <input
          name="meta_title"
          defaultValue={defaultValues?.meta_title ?? ''}
          placeholder={fallback?.title ?? 'Leave blank to use the default'}
          className={INPUT}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Replaces the {`<title>`} tag and the social-preview title.
        </span>
        {err('meta_title') && (
          <span className="mt-1 block text-xs text-red-600">{err('meta_title')}</span>
        )}
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">
          Meta description <span className="font-normal text-gray-500">(optional)</span>
        </span>
        <textarea
          name="meta_description"
          rows={3}
          defaultValue={defaultValues?.meta_description ?? ''}
          placeholder={
            fallback?.description ?? 'Short paragraph for SERPs and social previews.'
          }
          className={INPUT}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Aim for 150–160 characters.
        </span>
      </label>

      <label className="block text-sm">
        <span className="font-medium text-gray-700">
          Meta keywords{' '}
          <span className="font-normal text-gray-500">(optional, comma-separated)</span>
        </span>
        <input
          name="meta_keywords"
          defaultValue={defaultValues?.meta_keywords ?? ''}
          placeholder="e.g. samsung tv, 55 inch, 4k, guyana"
          className={INPUT}
        />
        <span className="mt-1 block text-xs text-gray-500">
          Bing still uses these; Google ignores them but doesn&apos;t penalise.
        </span>
      </label>
    </div>
  );
}
