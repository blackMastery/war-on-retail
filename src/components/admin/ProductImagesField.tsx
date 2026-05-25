'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadProductImage } from '@/app/admin/(panel)/products/image-actions';

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
};

export default function ProductImagesField({ initialFeaturedUrl, initialUrls = [] }: Props) {
  // Combine featured + gallery into one ordered list. Featured starts at index 0.
  const seed: ImageItem[] = [
    ...(initialFeaturedUrl ? [{ url: initialFeaturedUrl }] : []),
    ...initialUrls.map((url) => ({ url })),
  ];
  const [items, setItems] = useState<ImageItem[]>(seed);
  const [featuredIndex, setFeaturedIndex] = useState<number>(seed.length ? 0 : -1);
  const [globalError, setGlobalError] = useState<string>('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const featuredUrl = featuredIndex >= 0 ? items[featuredIndex]?.url ?? '' : '';
  const galleryUrls = items.filter((_, i) => i !== featuredIndex).map((it) => it.url);

  function handlePicked(files: FileList | null) {
    if (!files || !files.length) return;
    setGlobalError('');
    const fileArr = Array.from(files);

    // Reserve placeholder rows so the user sees progress for every file at once.
    setItems((prev) => {
      const next = [...prev, ...fileArr.map((f) => ({ url: `pending:${f.name}`, uploading: true }))];
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
    setItems((prev) => prev.filter((_, i) => i !== idx));
    setFeaturedIndex((prev) => {
      if (prev === idx) return -1; // featured was removed → none until user picks again
      if (prev > idx) return prev - 1;
      return prev;
    });
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs submitted with the surrounding ProductForm. */}
      <input type="hidden" name="featured_image_url" value={featuredUrl} />
      <input type="hidden" name="image_urls_json" value={JSON.stringify(galleryUrls)} />

      {/* Picker */}
      <label
        htmlFor="product-images-input"
        className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 transition hover:border-primary-400 hover:bg-primary-50"
      >
        <div>
          <p className="font-medium text-gray-700">
            Click to add images
            <span className="text-gray-400"> (or drag & drop)</span>
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
            {items.length} image{items.length === 1 ? '' : 's'} — pick which one is the featured
            image (shown on cards and product page hero).
          </legend>
          <ul
            role="list"
            className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
          >
            {items.map((item, i) => {
              const isFeatured = i === featuredIndex;
              const isPending = !!item.uploading;
              const hasError = !!item.error;
              return (
                <li
                  key={`${item.url}-${i}`}
                  className={`group relative overflow-hidden rounded-md ring-2 ${
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
                  </div>

                  {!isPending && (
                    <div className="flex items-center justify-between gap-1 border-t border-gray-200 bg-white px-2 py-1.5 text-xs">
                      <label className="flex cursor-pointer items-center gap-1">
                        <input
                          type="radio"
                          name="featured_image_radio"
                          checked={isFeatured}
                          onChange={() => setFeaturedIndex(i)}
                          disabled={hasError}
                          className="text-primary-600"
                        />
                        Featured
                      </label>
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
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
