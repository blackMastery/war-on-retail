'use client';

import { useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import { uploadBrandLogo } from '@/app/admin/(panel)/brands/image-actions';

type Props = {
  initialUrl?: string | null;
};

/**
 * Single-image picker for the brand form. Uploads via the `uploadBrandLogo`
 * server action and writes the resulting public URL into a hidden `logo_url`
 * input that the surrounding form submits. Renders against a checkered
 * pattern so transparency in the logo is obvious to the uploader.
 */
export default function BrandLogoField({ initialUrl }: Props) {
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
      const res = await uploadBrandLogo(fd);
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
      <input type="hidden" name="logo_url" value={url} />

      {url ? (
        <div className="space-y-2">
          <div
            className="relative aspect-[3/2] overflow-hidden rounded-md ring-1 ring-gray-200"
            style={{
              backgroundImage:
                'linear-gradient(45deg, #f3f4f6 25%, transparent 25%), linear-gradient(-45deg, #f3f4f6 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f3f4f6 75%), linear-gradient(-45deg, transparent 75%, #f3f4f6 75%)',
              backgroundSize: '20px 20px',
              backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
            }}
          >
            <Image src={url} alt="" fill className="object-contain p-3" />
          </div>
          <div className="flex gap-2 text-xs">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium hover:bg-gray-50"
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
          htmlFor="brand-logo-input"
          className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600 transition hover:border-primary-400 hover:bg-primary-50"
        >
          <div>
            <p className="font-medium text-gray-700">Click to upload brand logo</p>
            <p className="mt-1 text-xs text-gray-500">
              PNG with transparency preferred. Up to 5&nbsp;MB.
            </p>
          </div>
        </label>
      )}

      <input
        ref={inputRef}
        id="brand-logo-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(e) => handlePicked(e.target.files)}
      />

      {error && <p className="rounded-md bg-red-50 p-2 text-xs text-red-700">{error}</p>}
      {pending && (
        <p className="text-xs text-gray-500" aria-live="polite">
          Uploading…
        </p>
      )}
    </div>
  );
}
