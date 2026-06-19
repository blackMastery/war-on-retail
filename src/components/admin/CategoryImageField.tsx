'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadCategoryImage } from '@/app/admin/(panel)/categories/image-actions';

type Props = {
  initialUrl?: string | null;
};

/**
 * Single-image picker for the category form. Uploads via the
 * `uploadCategoryImage` server action and writes the resulting public URL
 * into a hidden `image_url` input on the surrounding form.
 */
export default function CategoryImageField({ initialUrl }: Props) {
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
      const res = await uploadCategoryImage(fd);
      if ('error' in res) setError(res.error);
      else setUrl(res.url);
    });
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="image_url" value={url} />

      {url ? (
        <div className="space-y-2">
          <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-muted ring-1 ring-border">
            <Image src={url} alt="" fill className="object-cover" />
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
          htmlFor="category-image-input"
          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted px-4 py-8 text-center text-sm text-muted-foreground transition hover:border-primary hover:bg-accent"
        >
          <div>
            <p className="font-medium text-secondary-foreground">Click to upload category image</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Shown on the category landing page. Up to 5&nbsp;MB.
            </p>
          </div>
        </label>
      )}

      <input
        ref={inputRef}
        id="category-image-input"
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
