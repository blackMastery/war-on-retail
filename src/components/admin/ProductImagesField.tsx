'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
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
  /**
   * Fires with the current uploaded URLs (featured first) whenever the set
   * changes — lets the surrounding form offer them elsewhere (variant images).
   */
  onUrlsChange?: (urls: string[]) => void;
};

const EMPTY_META: ProductImageMeta = { alt: null, caption: null, keywords: null };

export default function ProductImagesField({
  initialFeaturedUrl,
  initialUrls = [],
  initialImageMeta = {},
  initialFeaturedAlt = null,
  onUrlsChange,
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

  // Only finished uploads may reach the hidden inputs. Placeholder rows keep
  // a "pending:<filename>" fake URL while uploading (or after a failed
  // upload) — saving the form mid-upload used to persist that string into
  // featured_image_url/image_urls and crash next/image on the storefront.
  const isReady = (it: ImageItem | undefined): it is ImageItem =>
    !!it && !it.uploading && !it.error && !it.url.startsWith('pending:');
  const readyUrls = items.filter(isReady).map((it) => it.url);
  const featuredPick = featuredIndex >= 0 ? items[featuredIndex] : undefined;
  // If the chosen featured is still uploading at save time, fall back to the
  // first completed image rather than saving a product with no hero.
  const featuredUrl = isReady(featuredPick) ? featuredPick.url : readyUrls[0] ?? '';
  const galleryUrls = readyUrls.filter((u) => u !== featuredUrl);
  const featuredAlt = featuredUrl ? imageMeta[featuredUrl]?.alt ?? '' : '';

  // Report the finished-upload URLs upward (featured first).
  const uploadedUrls = [...(featuredUrl ? [featuredUrl] : []), ...galleryUrls];
  const uploadedKey = uploadedUrls.join('\n');
  useEffect(() => {
    onUrlsChange?.(uploadedUrls);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadedKey]);

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
        className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground transition hover:border-primary hover:bg-accent"
      >
        <div>
          <p className="font-medium text-secondary-foreground">
            Click to add images
            <span className="text-muted-foreground"> (or drag &amp; drop)</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
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
          <legend className="text-xs font-medium text-muted-foreground">
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
                    isFeatured ? 'ring-ring' : 'ring-border'
                  } bg-muted`}
                >
                  <div className="relative aspect-square">
                    {isPending || hasError ? (
                      <div
                        className={`flex h-full items-center justify-center text-xs ${
                          hasError ? 'text-red-700' : 'text-muted-foreground'
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
                      <span className="absolute left-1 top-1 rounded bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
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
                    <div className="border-t border-border bg-card">
                      <div className="flex items-center justify-between gap-1 px-2 py-1.5 text-xs">
                        <label className="flex cursor-pointer items-center gap-1">
                          <input
                            type="radio"
                            name="featured_image_radio"
                            checked={isFeatured}
                            onChange={() => setFeaturedIndex(i)}
                            className="text-primary"
                          />
                          Featured
                        </label>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenMetaIndex((cur) => (cur === i ? -1 : i))
                          }
                          aria-expanded={openMetaIndex === i}
                          className="font-medium text-primary hover:text-accent-foreground"
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
                        <div className="space-y-2 border-t border-border bg-muted px-2 py-2 text-xs">
                          <label className="block">
                            <span className="font-medium text-secondary-foreground">
                              Alt text
                            </span>
                            <input
                              type="text"
                              value={meta.alt ?? ''}
                              onChange={(e) =>
                                updateMeta(item.url, { alt: e.target.value })
                              }
                              placeholder="What's in the image (screen readers + SEO)"
                              className="mt-1 block w-full rounded-md border-border text-xs shadow-sm focus:border-ring focus:ring-ring"
                            />
                          </label>
                          <label className="block">
                            <span className="font-medium text-secondary-foreground">
                              Caption
                            </span>
                            <textarea
                              rows={2}
                              value={meta.caption ?? ''}
                              onChange={(e) =>
                                updateMeta(item.url, { caption: e.target.value })
                              }
                              placeholder="One-line description (used in JSON-LD)"
                              className="mt-1 block w-full rounded-md border-border text-xs shadow-sm focus:border-ring focus:ring-ring"
                            />
                          </label>
                          <label className="block">
                            <span className="font-medium text-secondary-foreground">
                              Keywords
                            </span>
                            <input
                              type="text"
                              value={meta.keywords ?? ''}
                              onChange={(e) =>
                                updateMeta(item.url, { keywords: e.target.value })
                              }
                              placeholder="comma-separated"
                              className="mt-1 block w-full rounded-md border-border text-xs shadow-sm focus:border-ring focus:ring-ring"
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
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Uploading…
        </p>
      )}
    </div>
  );
}
