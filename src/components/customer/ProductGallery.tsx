'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type Props = {
  images: string[];
  productName: string;
  /** Optional discount % — shown as a badge over the main image. */
  discount?: number;
};

const SWIPE_THRESHOLD = 40;

/**
 * Product image gallery with:
 *   - Click / Enter on a thumbnail → swap into the main view
 *   - ← / → arrow keys when the gallery has focus → previous / next image
 *   - Click the main image (or use the magnifier button) → opens a zoomed
 *     lightbox modal with ESC to close, ← / → to navigate, click-outside to
 *     dismiss
 *   - Touch swipe left / right on the main image → navigate
 *   - `aria-live` region announces the active image to screen readers
 *
 * If `images` is empty, renders a neutral placeholder.
 */
export default function ProductGallery({ images, productName, discount = 0 }: Props) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const total = images.length;
  const safeActive = total === 0 ? 0 : Math.min(active, total - 1);
  const current = images[safeActive];

  const next = useCallback(
    () => total && setActive((i) => (i + 1) % total),
    [total],
  );
  const prev = useCallback(
    () => total && setActive((i) => (i - 1 + total) % total),
    [total],
  );

  // Main-view keyboard nav (only when nothing inside is open / focused elsewhere).
  const wrapperRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (zoomed) return; // lightbox handles its own keys
      if (!wrapperRef.current?.contains(document.activeElement)) return;
      if (e.key === 'ArrowRight') {
        next();
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        prev();
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed, next, prev]);

  // Touch swipe on main image.
  const touchStartX = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
    if (Math.abs(dx) > SWIPE_THRESHOLD) (dx < 0 ? next : prev)();
    touchStartX.current = null;
  }

  if (total === 0) {
    return (
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 text-7xl text-gray-300"
        aria-label={`No image available for ${productName}`}
      >
        <span aria-hidden="true">📦</span>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="space-y-3">
      {/* Main view */}
      <figure className="relative">
        <button
          type="button"
          onClick={() => setZoomed(true)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          aria-label={`Zoom image ${safeActive + 1} of ${total}`}
          className="group relative block aspect-square w-full overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <Image
            src={current}
            alt={`${productName} — image ${safeActive + 1}`}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority={safeActive === 0}
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded bg-primary-600 px-2 py-0.5 text-sm font-bold text-white">
              -{discount}%
            </span>
          )}
          <span
            aria-hidden="true"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4" />
          </span>
        </button>

        {/* Inline prev/next when there's more than one image. */}
        {total > 1 && (
          <>
            <NavButton onClick={prev} direction="prev" />
            <NavButton onClick={next} direction="next" />
          </>
        )}

        <figcaption className="sr-only" aria-live="polite" aria-atomic="true">
          Image {safeActive + 1} of {total}
        </figcaption>
      </figure>

      {/* Thumbnails */}
      {total > 1 && (
        <ul role="list" className="grid grid-cols-5 gap-2 sm:grid-cols-6">
          {images.map((src, i) => {
            const isActive = i === safeActive;
            return (
              <li key={`${src}-${i}`}>
                <button
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative block aspect-square w-full overflow-hidden rounded-md ring-2 transition-shadow focus-visible:outline-none focus-visible:ring-primary-600 ${
                    isActive
                      ? 'ring-primary-600'
                      : 'ring-gray-200 hover:ring-gray-400'
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {zoomed && (
        <Lightbox
          images={images}
          active={safeActive}
          onActive={setActive}
          onClose={() => setZoomed(false)}
          productName={productName}
        />
      )}
    </div>
  );
}

function NavButton({
  onClick,
  direction,
}: {
  onClick: () => void;
  direction: 'prev' | 'next';
}) {
  const Icon = direction === 'prev' ? ChevronLeftIcon : ChevronRightIcon;
  return (
    <button
      type="button"
      onClick={(e) => {
        // Stop the parent button (which opens the lightbox) from also firing.
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      aria-label={direction === 'prev' ? 'Previous image' : 'Next image'}
      className={`absolute top-1/2 -translate-y-1/2 ${
        direction === 'prev' ? 'left-2' : 'right-2'
      } hidden h-9 w-9 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200 hover:bg-white sm:flex`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
}

// ---------- Lightbox ----------

function Lightbox({
  images,
  active,
  onActive,
  onClose,
  productName,
}: {
  images: string[];
  active: number;
  onActive: (i: number) => void;
  onClose: () => void;
  productName: string;
}) {
  const total = images.length;
  const containerRef = useRef<HTMLDivElement>(null);

  const next = useCallback(() => onActive((active + 1) % total), [active, onActive, total]);
  const prev = useCallback(
    () => onActive((active - 1 + total) % total),
    [active, onActive, total],
  );

  // Keyboard: ESC to close, arrows to navigate.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, next, prev]);

  // Move focus into the dialog on open + restore on close, and lock body scroll.
  const previouslyFocused = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, []);

  // Touch swipe inside the lightbox.
  const touchStartX = useRef<number | null>(null);
  const heading = useMemo(() => `${productName} — image ${active + 1} of ${total}`, [
    productName,
    active,
    total,
  ]);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      tabIndex={-1}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 outline-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => (touchStartX.current = e.touches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchStartX.current == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(dx) > SWIPE_THRESHOLD) (dx < 0 ? next : prev)();
        touchStartX.current = null;
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          >
            <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next image"
            className="absolute right-2 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 sm:flex"
          >
            <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </>
      )}

      <div className="relative h-full max-h-[85vh] w-full max-w-5xl">
        <Image
          src={images[active]}
          alt={heading}
          fill
          sizes="100vw"
          priority
          className="object-contain"
        />
      </div>

      {total > 1 && (
        <p
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white tabular-nums"
          aria-live="polite"
          aria-atomic="true"
        >
          {active + 1} / {total}
        </p>
      )}
    </div>
  );
}
