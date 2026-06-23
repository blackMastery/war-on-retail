'use client';

import { StarIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon } from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

type StarRatingProps = {
  rating: number;
  /** Max stars to render (default 5). */
  max?: number;
  /** When set, stars become clickable and call onChange. */
  onChange?: (rating: number) => void;
  /** Optional count shown beside stars, e.g. "(12)". */
  count?: number;
  size?: 'sm' | 'md';
  className?: string;
};

/**
 * Read-only or interactive 1–5 star display. Interactive mode uses hover
 * preview and click-to-select; read-only fills stars proportionally to rating.
 */
export default function StarRating({
  rating,
  max = 5,
  onChange,
  count,
  size = 'md',
  className,
}: StarRatingProps) {
  const interactive = Boolean(onChange);
  const iconClass = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div
      className={cn('inline-flex items-center gap-0.5', className)}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={interactive ? 'Rating' : `${rating} out of ${max} stars`}
    >
      {Array.from({ length: max }, (_, i) => {
        const value = i + 1;
        const filled = value <= Math.round(rating);
        const Star = filled ? StarIcon : StarOutlineIcon;

        if (interactive) {
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={value === rating}
              aria-label={`${value} star${value === 1 ? '' : 's'}`}
              onClick={() => onChange?.(value)}
              className={cn(
                'rounded p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                value <= rating ? 'text-amber-500' : 'text-muted-foreground hover:text-amber-400',
              )}
            >
              <Star className={iconClass} aria-hidden="true" />
            </button>
          );
        }

        return (
          <Star
            key={value}
            className={cn(iconClass, filled ? 'text-amber-500' : 'text-muted-foreground/40')}
            aria-hidden="true"
          />
        );
      })}
      {count != null && count > 0 && (
        <span className={cn('ml-1 text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          ({count})
        </span>
      )}
    </div>
  );
}
