'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadProductImage } from '@/app/admin/(panel)/products/image-actions';
import type { ProductImageMeta } from '@/types/database';

type ImageItem = {
  url: string;
  /** True while the action is in flight; thumbnail shows a spinner. */
  uploading?: boolean;
  /** Per-image error from the most recent upload attempt. */
  error?: string;
};

type Props = {
  /** Initial featured image URL (rendered first, marked as the chosen featured). */
  initialFeaturedUrl?: string | null;
  /** Initial gallery URLs (in addition to the featured). */
  initialUrls?: string[];
  /** Initial per-image alt/caption/keywords lookup, keyed by URL. */
  initialImageMeta?: Record<string, ProductImageMeta>;
  /** Featured image's alt — stored on its own column for fast SSR lookup. */
  initialFeaturedAlt?: string | null;
};

const EMPTY_META: ProductImageMeta = { alt: null, caption: null, keywords: null };

export default function ProductImagesField({
  initialFeaturedUrl,
  initialUrls = [],
  initialImageMeta = {},
  initialFeaturedAlt = null,
}: Props) {
  // Combine featured + gallery into one ordered list. Featured starts at index 0.
  const seed: ImageItem[] = [
    ...(initialFeaturedUrl ? [{ url: initialFeaturedUrl }] : []),
    ...initialUrls.map((url) => ({ url })),
  ];
  const [items, setItems] = useState<ImageItem[]>(seed);
  const [featuredIndex, setFeaturedIndex] = useState<number>(seed.length ? 0 : -1);
  const [globalError, setGlobalError] = useState<string>('');
  // Per-URL metadata cache. The featured image's `alt` is also kept here so
  // the UI is uniform; on submit we also write it to the `featured_image_alt`
  // hidden input so the customer page has a fast lookup.
  const [imageMeta, setImageMeta] = useState<Record<string, ProductImageMeta>>(() => {
    const seeded: Record<string, ProductImageMeta> = { ...initialImageMeta };
    if (initialFeaturedUrl && initialFeaturedAlt) {
      seeded[initialFeaturedUrl] = {
        ...(seeded[initialFeaturedUrl] ?? EMPTY_META),
        alt: seeded[initialFeaturedUrl]?.alt ?? initialFeaturedAlt,
      };
    }
    return seeded;
  });
  // Track which thumbnail's metadata panel is open. -1 = none.
  const [openMetaIndex, setOpenMetaIndex] = useState<number>(-1);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const featuredUrl = featuredIndex >= 0 ? items[featuredIndex]?.url ?? '' : '';
  const galleryUrls = items.filter((_, i) => i !== featuredIndex).map((it) => it.url);
  const featuredAlt = featuredUrl ? imageMeta[featuredUrl]?.alt ?? '' : '';

  // Strip metadata for URLs that aren't in the live list anymore, so the
  // server doesn't get a bag of orphans to walk through. Featured + gallery
  // together are the source of truth.
  const liveUrls = new Set<string>([
    ...(featuredUrl ? [featuredUrl] : []),
    ...galleryUrls,
  ]);
  const cleanedMeta: Record<string, ProductImageMeta> = {};
  for (const [url, meta] of Object.entries(imageMeta)) {
    if (!liveUrls.has(url)) continue;
    if (!meta.alt && !meta.caption && !meta.keywords) continue;
    cleanedMeta[url] = meta;
  }

  function updateMeta(url: string, patch: Partial<ProductImageMeta>) {
    setImageMeta((prev) => ({
      ...prev,
      [url]: { ...(prev[url] ?? EMPTY_META), ...patch },
    }));
  }

  function handlePicked(files: FileList | null) {
    if (!files || !files.length) return;
    setGlobalError('');
    const fileArr = Array.from(files);

    // Reserve placeholder rows so the user sees progress for every file at once.
    setItems((prev) => {
      const next = [
        ...prev,
        ...fileArr.map((f) => ({ url: `pending:${f.name}`, uploading: true })),
      ];
      // First-ever upload becomes the featured automatically.
      if (featuredIndex === -1 && next.length > 0) setFeaturedIndex(prev.length);
      return next;
    });

    fileArr.forEach((file, offset) => {
      const slotIndex = items.length + offset;
      const fd = new FormData();
      fd.append('file', file);
      startTransition(async () => {
        const res = await uploadProductImage(fd);
        setItems((prev) => {
          const next = [...prev];
          if (!next[slotIndex]) return prev;
          if ('error' in res) {
            next[slotIndex] = { ...next[slotIndex], uploading: false, error: res.error };
          } else {
            next[slotIndex] = { url: res.url };
          }
          return next;
        });
      });
    });

    if (inputRef.current) inputRef.current.value = '';
  }

  function removeAt(idx: number) {
    const removed = items[idx]?.url;
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setFeaturedIndex((prev) => {
      if (prev === idx) return -1;
      if (prev > idx) return prev - 1;
      return prev;
    });
    if (openMetaIndex === idx) setOpenMetaIndex(-1);
    // Don't drop the metadata immediately — it gets cleaned out by the
    // `cleanedMeta` filter above on the next render. This way, "undo by
    // re-adding" with the same URL would re-attach its alt text. Good enough
    // for the rare case where the admin removes and re-uploads.
    if (removed) {
      setImageMeta((prev) => {
        if (!prev[removed]) return prev;
        const { [removed]: _drop, ...rest } = prev;
        return rest;
      });
    }
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs submitted with the surrounding ProductForm. */}
      <input type="hidden" name="featured_image_url" value={featuredUrl} />
      <input type="hidden" name="featured_image_alt" value={featuredAlt} />
      <input type="hidden" name="image_urls_json" value={JSON.stringify(galleryUrls)} />
      <input type="hidden" name="image_meta_json" value={JSON.stringify(cleanedMeta)} />

      {/* Picker */}
      <label
        htmlFor="product-images-input"
        className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 transition hover:border-primary-400 hover:bg-primary-50"
      >
        <div>
          <p className="font-medium text-gray-700">
            Click to add images
            <span className="text-gray-400"> (or drag &amp; drop)</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            JPG, PNG, WebP, AVIF — up to 5&nbsp;MB each
          </p>
        </div>
        <input
          ref={inputRef}
          id="product-images-input"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
          multiple
          className="sr-only"
          onChange={(e) => handlePicked(e.target.files)}
        />
      </label>

      {globalError && (
        <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{globalError}</p>
      )}

      {/* Thumbnails */}
      {items.length > 0 && (
        <fieldset>
          <legend className="text-xs font-medium text-gray-600">
            {items.length} image{items.length === 1 ? '' : 's'} — pick the
            featured image and (optionally) describe each one for accessibility +
            search.
          </legend>
          <ul
            role="list"
            className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          >
            {items.map((item, i) => {
              const isFeatured = i === featuredIndex;
              const isPending = !!item.uploading;
              const hasError = !!item.error;
              const meta = imageMeta[item.url] ?? EMPTY_META;
              const hasMeta = !!(meta.alt || meta.caption || meta.keywords);
              return (
                <li
                  key={`${item.url}-${i}`}
                  className={`group overflow-hidden rounded-md ring-2 ${
                    isFeatured ? 'ring-primary-600' : 'ring-gray-200'
                  } bg-gray-100`}
                >
                  <div className="relative aspect-square">
                    {isPending || hasError ? (
                      <div
                        className={`flex h-full items-center justify-center text-xs ${
                          hasError ? 'text-red-700' : 'text-gray-500'
                        }`}
                      >
                        {hasError ? `✗ ${item.error}` : 'Uploading…'}
                      </div>
                    ) : (
                      <Image
                        src={item.url}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-cover"
                      />
                    )}
                    {isFeatured && !isPending && !hasError && (
                      <span className="absolute left-1 top-1 rounded bg-primary-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Featured
                      </span>
                    )}
                    {hasMeta && !isPending && !hasError && (
                      <span
                        title="This image has alt / caption / keywords"
                        className="absolute right-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                      >
                        Meta
                      </span>
                    )}
                  </div>

                  {!isPending && !hasError && (
                    <div className="border-t border-gray-200 bg-white">
                      <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                        <label className="flex cursor-pointer items-center gap-1">
                          <input
                            type="radio"
                            name="featured_image_radio"
                            checked={isFeatured}
                            onChange={() => setFeaturedIndex(i)}
                            className="text-primary-600"
                          />
                          Featured
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMetaIndex((cur) => (cur === i ? -1 : i))
                          }
                          aria-expanded={openMetaIndex === i}
                          className="font-medium text-primary-600 hover:text-primary-700"
                        >
                          {openMetaIndex === i ? 'Hide' : hasMeta ? 'Edit meta' : 'Add meta'}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAt(i)}
                          className="font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>

                      {openMetaIndex === i && (
                        <div className="space-y-2 border-t border-gray-100 bg-gray-50 px-2 py-2 text-xs">
                          <label className="block">
                            <span className="font-medium text-gray-700">
                              Alt text
                            </span>
                            <input
                              type="text"
                              value={meta.alt ?? ''}
                              onChange={(e) =>
                                updateMeta(item.url, { alt: e.target.value })
                              }
                              placeholder="What's in the image (screen readers + SEO)"
                              className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </label>
                          <label className="block">
                            <span className="font-medium text-gray-700">
                              Caption
                            </span>
                            <textarea
                              rows={2}
                              value={meta.caption ?? ''}
                              onChange={(e) =>
                                updateMeta(item.url, { caption: e.target.value })
                              }
                              placeholder="One-line description (used in JSON-LD)"
                              className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </label>
                          <label className="block">
                            <span className="font-medium text-gray-700">
                              Keywords
                            </span>
                            <input
                              type="text"
                              value={meta.keywords ?? ''}
                              onChange={(e) =>
                                updateMeta(item.url, { keywords: e.target.value })
                              }
                              placeholder="comma-separated"
                              className="mt-1 block w-full rounded-md border-gray-300 text-xs shadow-sm focus:border-primary-500 focus:ring-primary-500"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {pending && (
        <p className="text-xs text-gray-500" aria-live="polite">
          Uploading…
        </p>
      )}
    </div>
  );
}
