'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { formatPrice } from '@/lib/utils';

type Props = {
  /** Catalogue minimum, used as the slider's lower bound. */
  bounds: { min: number; max: number };
  /** Current filter selection (null = not set, use bounds). */
  value: { min: number | null; max: number | null };
  /** Fires only on release / blur — not on every drag tick. */
  onCommit: (next: { min: number | null; max: number | null }) => void;
  /** Step in GYD; defaults to a sensible rounding by range. */
  step?: number;
};

/**
 * Dual-thumb price slider with paired number inputs for direct entry.
 *
 * - Drag a thumb → `value` mirrors locally for instant visual feedback.
 * - Release the thumb (Radix `onValueCommit`) → calls `onCommit` once with the
 *   final pair. We deliberately do NOT commit on every tick because each
 *   commit triggers a server re-render of the product grid.
 * - The two number inputs commit on blur / Enter, same as the slider release.
 * - If the chosen min/max equals the catalogue bounds, the callback emits
 *   `null` for that side so the URL stays clean and the filter ledger doesn't
 *   show a redundant chip.
 */
export default function PriceRangeSlider({ bounds, value, onCommit, step }: Props) {
  const safeBounds = useMemo(() => {
    // Guard against bounds.min === bounds.max (e.g. only one product in stock)
    const min = Math.max(0, Math.floor(bounds.min));
    const max = Math.max(min + 1, Math.ceil(bounds.max));
    return { min, max };
  }, [bounds.min, bounds.max]);

  const resolvedStep = step ?? deriveStep(safeBounds.max - safeBounds.min);

  // Local draft mirrors the slider thumbs during drag.
  const initial = [
    value.min ?? safeBounds.min,
    value.max ?? safeBounds.max,
  ] as [number, number];
  const [draft, setDraft] = useState<[number, number]>(initial);

  // Re-hydrate when the URL-derived value changes (e.g. chip removal).
  useEffect(() => {
    setDraft([value.min ?? safeBounds.min, value.max ?? safeBounds.max]);
  }, [value.min, value.max, safeBounds.min, safeBounds.max]);

  const minId = useId();
  const maxId = useId();

  function emit(next: [number, number]) {
    const [lo, hi] = next;
    onCommit({
      min: lo <= safeBounds.min ? null : lo,
      max: hi >= safeBounds.max ? null : hi,
    });
  }

  function commitFromInput(side: 'min' | 'max', raw: string) {
    const num = raw === '' ? null : Number(raw);
    if (num != null && !Number.isFinite(num)) return;
    // Constrain to [bounds.min, bounds.max] and keep min ≤ max.
    let lo = side === 'min' ? num ?? safeBounds.min : draft[0];
    let hi = side === 'max' ? num ?? safeBounds.max : draft[1];
    lo = Math.max(safeBounds.min, Math.min(lo, safeBounds.max));
    hi = Math.max(safeBounds.min, Math.min(hi, safeBounds.max));
    if (lo > hi) [lo, hi] = [hi, lo];
    setDraft([lo, hi]);
    emit([lo, hi]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between text-xs tabular-nums text-muted-foreground">
        <span aria-hidden="true">{formatPrice(draft[0])}</span>
        <span aria-hidden="true">{formatPrice(draft[1])}</span>
      </div>

      <Slider.Root
        value={draft}
        min={safeBounds.min}
        max={safeBounds.max}
        step={resolvedStep}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => setDraft([v[0], v[1]] as [number, number])}
        onValueCommit={(v) => emit([v[0], v[1]] as [number, number])}
        aria-label="Price range"
        className="relative flex h-5 w-full touch-none select-none items-center"
      >
        <Slider.Track className="relative h-1.5 grow rounded-full bg-muted">
          <Slider.Range className="absolute h-full rounded-full bg-primary" />
        </Slider.Track>
        <Slider.Thumb
          aria-label="Minimum price"
          className="block h-4 w-4 rounded-full border border-primary bg-card shadow ring-ring transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
        />
        <Slider.Thumb
          aria-label="Maximum price"
          className="block h-4 w-4 rounded-full border border-primary bg-card shadow ring-ring transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2"
        />
      </Slider.Root>

      <div className="flex items-center gap-2">
        <label htmlFor={minId} className="flex-1 text-xs">
          <span className="sr-only">Minimum price</span>
          <input
            id={minId}
            name="min_price"
            type="number"
            inputMode="numeric"
            min={safeBounds.min}
            max={safeBounds.max}
            step={resolvedStep}
            placeholder={String(safeBounds.min)}
            value={value.min ?? ''}
            onChange={(e) =>
              setDraft(([_, hi]) => [
                e.target.value === '' ? safeBounds.min : Number(e.target.value),
                hi,
              ])
            }
            onBlur={(e) => commitFromInput('min', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            className="w-full rounded-md border-border text-sm tabular-nums shadow-sm focus:border-ring focus:ring-ring"
          />
        </label>
        <span aria-hidden="true" className="text-muted-foreground">
          –
        </span>
        <label htmlFor={maxId} className="flex-1 text-xs">
          <span className="sr-only">Maximum price</span>
          <input
            id={maxId}
            name="max_price"
            type="number"
            inputMode="numeric"
            min={safeBounds.min}
            max={safeBounds.max}
            step={resolvedStep}
            placeholder={String(safeBounds.max)}
            value={value.max ?? ''}
            onChange={(e) =>
              setDraft(([lo]) => [
                lo,
                e.target.value === '' ? safeBounds.max : Number(e.target.value),
              ])
            }
            onBlur={(e) => commitFromInput('max', e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            className="w-full rounded-md border-border text-sm tabular-nums shadow-sm focus:border-ring focus:ring-ring"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Picks a step that gives ~100 stops across the range. Rounds to a "nice"
 * multiple (1, 2, 5 × 10^n) so the thumb snaps to readable values.
 */
function deriveStep(range: number): number {
  if (range <= 0) return 1;
  const target = range / 100;
  const magnitude = Math.pow(10, Math.floor(Math.log10(target)));
  const normalised = target / magnitude;
  if (normalised < 2) return magnitude;
  if (normalised < 5) return 2 * magnitude;
  return 5 * magnitude;
}
