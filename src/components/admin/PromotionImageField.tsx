'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadPromotionImage } from '@/app/admin/(panel)/promotions/image-actions';

type Props = {
  initialUrl?: string | null;
};

/**
 * Single-image picker for the promotion form. Uploads via the
 * `uploadPromotionImage` server action and writes the resulting public URL
 * into a hidden `image_url` input that the surrounding form submits.
 */
export default function PromotionImageField({ initialUrl }: Props) {
  const [url, setUrl] = useState<string>(initialUrl ?? '');
  const [error, setError] = useState<string>('');
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePicked(files: FileList | null) {
    setError('');
    const file = files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    startTransition(async () => {
      const res = await uploadPromotionImage(fd);
      if ('error' in res) {
        setError(res.error);
      } else {
        setUrl(res.url);
      }
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="image_url" value={url} />

      {url ? (
        <div className="space-y-2">
          <div className="relative aspect-[16/9] overflow-hidden rounded-md ring-1 ring-border bg-muted">
            <Image src={url} alt="" fill sizes="(min-width: 768px) 50vw, 100vw" className="object-cover" />
          </div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-border px-3 py-1.5 font-medium hover:bg-muted"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => setUrl('')}
              className="font-medium text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <label
          htmlFor="promotion-image-input"
          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted px-4 py-10 text-center text-sm text-muted-foreground transition hover:border-primary hover:bg-accent"
        >
          <div>
            <p className="font-medium text-secondary-foreground">Click to upload promotion image</p>
            <p className="mt-1 text-xs text-muted-foreground">
              JPG, PNG, WebP, AVIF — up to 5&nbsp;MB. Recommended 16:9 ratio.
            </p>
          </div>
        </label>
      )}

      <input
        ref={inputRef}
        id="promotion-image-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(e) => handlePicked(e.target.files)}
      />

      {error && <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {pending && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Uploading…
        </p>
      )}
    </div>
  );
}
