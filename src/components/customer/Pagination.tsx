import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

type Props = {
  currentPage: number;
  totalPages: number;
  /**
   * Base query string (without the `page` param) that should be preserved on
   * every page link. Pass `filtersToQuery(filters)` from the page that owns
   * the filter state.
   */
  baseQuery: string;
  /** Path the links point at — defaults to `/products`. */
  basePath?: string;
};

/**
 * Numbered pagination with prev / next chevrons. When there are many pages,
 * compresses to: 1 … n-1 n n+1 … last so the bar stays a fixed width.
 *
 * Each page is a real `<Link>` — middle-click and Cmd-click both work, the
 * URL is the source of truth, and we keep `scroll: false` so the user's
 * scroll position is preserved across page changes (matching the filter UX).
 */
export default function Pagination({
  currentPage,
  totalPages,
  baseQuery,
  basePath = '/products',
}: Props) {
  if (totalPages <= 1) return null;

  const safeCurrent = Math.max(1, Math.min(currentPage, totalPages));
  const pages = buildPageList(safeCurrent, totalPages);

  function urlFor(page: number): string {
    const params = new URLSearchParams(baseQuery);
    if (page === 1) params.delete('page');
    else params.set('page', String(page));
    const qs = params.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  }

  const prev = safeCurrent > 1 ? urlFor(safeCurrent - 1) : null;
  const next = safeCurrent < totalPages ? urlFor(safeCurrent + 1) : null;

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-center gap-1 text-sm"
    >
      {prev ? (
        <Link
          href={prev}
          scroll={false}
          rel="prev"
          aria-label="Previous page"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 font-medium text-secondary-foreground hover:bg-muted"
        >
          <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-muted px-3 font-medium text-muted-foreground"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </span>
      )}

      <ol className="flex items-center gap-1">
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-2 text-muted-foreground"
            >
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={urlFor(p)}
                scroll={false}
                aria-label={`Page ${p}`}
                aria-current={p === safeCurrent ? 'page' : undefined}
                className={`inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm tabular-nums ${
                  p === safeCurrent
                    ? 'border-primary bg-primary font-semibold text-primary-foreground'
                    : 'border-border bg-card text-secondary-foreground hover:bg-muted'
                }`}
              >
                {p}
              </Link>
            </li>
          ),
        )}
      </ol>

      {next ? (
        <Link
          href={next}
          scroll={false}
          rel="next"
          aria-label="Next page"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-card px-3 font-medium text-secondary-foreground hover:bg-muted"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span
          aria-hidden="true"
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-muted px-3 font-medium text-muted-foreground"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRightIcon className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

/**
 * Produces a page list with ellipses for compactness:
 *   - Always shows 1 and last
 *   - Window of 2 either side of current
 *   - 'ellipsis' marker for gaps
 *
 * Examples (current = 5, total = 20):  1 … 4 5 6 … 20
 *           (current = 2, total = 10):  1 2 3 4 … 10
 *           (current = 9, total = 10):  1 … 7 8 9 10
 */
function buildPageList(current: number, total: number): (number | 'ellipsis')[] {
  const out: (number | 'ellipsis')[] = [];
  const window = 1;
  const start = Math.max(2, current - window);
  const end = Math.min(total - 1, current + window);

  out.push(1);
  if (start > 2) out.push('ellipsis');
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push('ellipsis');
  if (total > 1) out.push(total);
  return out;
}
