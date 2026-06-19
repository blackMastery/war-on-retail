import type { PaginationState } from '@/lib/pagination';

type Props = {
  state: PaginationState;
  noun?: { singular: string; plural: string };
  /** Custom message when count is zero. */
  emptyMessage?: string;
};

/**
 * Tiny "Showing 25–48 of 130 products" line shown above the grid on paginated
 * list pages. Falls back to "N products" when everything fits on one page,
 * and to `emptyMessage` when there are none.
 */
export default function ResultCount({
  state,
  noun = { singular: 'product', plural: 'products' },
  emptyMessage,
}: Props) {
  if (state.count === 0) {
    return (
      <p className="mt-1 text-sm text-muted-foreground">
        {emptyMessage ?? `No ${noun.plural} to show.`}
      </p>
    );
  }
  if (state.count <= state.pageSize) {
    return (
      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
        {state.count} {state.count === 1 ? noun.singular : noun.plural}
      </p>
    );
  }
  return (
    <p className="mt-1 text-sm text-muted-foreground tabular-nums">
      Showing {state.firstIdx}–{state.lastIdx} of {state.count} {noun.plural}
    </p>
  );
}
