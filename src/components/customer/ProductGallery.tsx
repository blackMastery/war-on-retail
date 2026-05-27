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

// Gesture thresholds (in CSS pixels).
const SWIPE_THRESHOLD = 40;
const TAP_MAX_TRAVEL = 10; // beyond this, a finger-up is NOT a tap
const TAP_MAX_DURATION = 500; // ms

/**
 * Product image gallery.
 *
 * Pointer Events (`pointerdown` / `pointermove` / `pointerup`) replace the
 * old touch-event + synthesised-click pattern. Synthesised clicks on iOS
 * Safari and Android Chrome were unreliable — sometimes firing twice,
 * sometimes after a swipe, sometimes never. Pointer Events give us the exact
 * start/end (x, y, time) and let us classify the gesture deterministically
 * inside a single handler.
 *
 * Decision tree in `onPointerUp`:
 *   - Horizontal travel > SWIPE_THRESHOLD AND > vertical travel → navigate.
 *   - Total travel < TAP_MAX_TRAVEL within TAP_MAX_DURATION ms → open lightbox.
 *   - Otherwise → ignore (probably a vertical scroll start that lifted).
 *
 * Keyboard support is its own path: the main image area has `role="button"`
 * and `tabIndex={0}`, with onKeyDown handling Enter/Space (open lightbox) and
 * arrows (navigate).
 */
export default function ProductGallery({ images, productName, discount = 0 }: Props) {
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const total = images.length;
  const safeActive = total === 0 ? 0 : Math.min(active, total - 1);
  const current = images[safeActive];

  const next = useCallback(() => total && setActive((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => total && setActive((i) => (i - 1 + total) % total), [total]);

  // Pointer-gesture state — set in pointerdown, classified in pointerup.
  type PointerStart = { x: number; y: number; time: number; pointerId: number };
  const pointerStart = useRef<PointerStart | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    // Only track primary pointer — ignore multi-touch (pinch-zoom etc.).
    if (!e.isPrimary) return;
    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      pointerId: e.pointerId,
    };
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.pointerId !== e.pointerId) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const elapsed = Date.now() - start.time;

    // Horizontal swipe — navigate, never zoom.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
      return;
    }

    // Tap — open lightbox. (Slow drags that landed near the start get ignored.)
    if (Math.abs(dx) <= TAP_MAX_TRAVEL && Math.abs(dy) <= TAP_MAX_TRAVEL && elapsed <= TAP_MAX_DURATION) {
      setZoomed(true);
    }
  }

  function onPointerCancel() {
    pointerStart.current = null;
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setZoomed(true);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      next();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      prev();
    }
  }

  if (total === 0) {
    return (
      <div
        className="relative flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-7xl text-gray-300 ring-1 ring-gray-200"
        aria-label={`No image available for ${productName}`}
      >
        <span aria-hidden="true">📦</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main view */}
      <figure className="relative">
        <div
          role="button"
          tabIndex={0}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onKeyDown={onKeyDown}
          aria-label={`Zoom image ${safeActive + 1} of ${total}`}
          // `pan-y` lets vertical scrolling stay smooth; we own horizontal.
          // `select-none` stops mobile text-selection from kicking in.
          // `touch-callout` is iOS-only; nukes the "save image" long-press.
          className="group relative block aspect-square w-full cursor-zoom-in select-none overflow-hidden rounded-lg bg-gray-100 ring-1 ring-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          style={{ touchAction: 'pan-y', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
        >
          <Image
            src={current}
            alt={`${productName} — image ${safeActive + 1}`}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            priority={safeActive === 0}
            className="pointer-events-none object-cover"
            draggable={false}
          />
          {discount > 0 && (
            <span className="pointer-events-none absolute left-3 top-3 rounded bg-primary-600 px-2 py-0.5 text-sm font-bold text-white">
              -{discount}%
            </span>
          )}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-gray-700 shadow-sm opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <MagnifyingGlassPlusIcon className="h-4 w-4" />
          </span>
        </div>

        {/* Prev/next — visible at all viewports, sized for thumbs on mobile. */}
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
                    isActive ? 'ring-primary-600' : 'ring-gray-200 hover:ring-gray-400'
                  }`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="120px"
                    className="pointer-events-none object-cover"
                    draggable={false}
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
      onClick={onClick}
      // Stop pointer events from also hitting the parent image's gesture
      // handlers — the chevron is an explicit action, not a swipe.
      onPointerDown={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      aria-label={direction === 'prev' ? 'Previous image' : 'Next image'}
      className={`absolute top-1/2 -translate-y-1/2 ${
        direction === 'prev' ? 'left-2' : 'right-2'
      } flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-gray-700 shadow-md ring-1 ring-gray-200 hover:bg-white sm:h-9 sm:w-9`}
    >
      <Icon className="h-5 w-5 sm:h-4 sm:w-4" aria-hidden="true" />
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

  // Keyboard: ESC closes, arrows navigate.
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

  // Focus management + body-scroll lock.
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

  // Pointer-event swipe (same pattern as the main view).
  type PointerStart = { x: number; y: number; pointerId: number; onImage: boolean };
  const pointerStart = useRef<PointerStart | null>(null);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!e.isPrimary) return;
    pointerStart.current = {
      x: e.clientX,
      y: e.clientY,
      pointerId: e.pointerId,
      // Was the pointer-down on the image itself, or on the backdrop?
      onImage: (e.target as HTMLElement).closest('[data-lightbox-image]') != null,
    };
  }
  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || start.pointerId !== e.pointerId) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;

    // Swipe → navigate.
    if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else prev();
      return;
    }

    // Tap on the backdrop (not the image, not a button) → close.
    if (
      Math.abs(dx) <= TAP_MAX_TRAVEL &&
      Math.abs(dy) <= TAP_MAX_TRAVEL &&
      !start.onImage &&
      e.target === e.currentTarget
    ) {
      onClose();
    }
  }
  function onPointerCancel() {
    pointerStart.current = null;
  }

  const heading = useMemo(
    () => `${productName} — image ${active + 1} of ${total}`,
    [productName, active, total],
  );

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      tabIndex={-1}
      style={{ touchAction: 'pan-y' }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 outline-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <button
        type="button"
        onClick={onClose}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        style={{ marginTop: 'env(safe-area-inset-top)' }}
      >
        <XMarkIcon className="h-6 w-6" aria-hidden="true" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            aria-label="Previous image"
            className="absolute left-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronLeftIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={next}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            aria-label="Next image"
            className="absolute right-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <ChevronRightIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </>
      )}

      <div
        data-lightbox-image
        className="relative h-full max-h-[85vh] w-full max-w-5xl"
      >
        <Image
          src={images[active]}
          alt={heading}
          fill
          sizes="100vw"
          priority
          className="pointer-events-none object-contain"
          draggable={false}
        />
      </div>

      {total > 1 && (
        <p
          className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white tabular-nums"
          aria-live="polite"
          aria-atomic="true"
          style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
        >
          {active + 1} / {total}
        </p>
      )}
    </div>
  );
}
