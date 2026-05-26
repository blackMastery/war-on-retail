/**
 * Shared page-number parsing + range math for every paginated list view.
 *
 * Two functions:
 *   - `parsePage(raw)`     — clamp `?page=` from searchParams to an integer ≥ 1
 *   - `paginate({...})`    — given the requested page, total `count` from
 *                            Supabase, and the actual returned rows, computes
 *                            everything the `<Pagination>` component and the
 *                            result-count line need.
 *
 * Usage pattern in a page:
 *
 *   const requestedPage = parsePage(sp.page);
 *   const offset = (requestedPage - 1) * PAGE_SIZE;
 *   const { data, count } = await q.range(offset, offset + PAGE_SIZE - 1);
 *   const p = paginate({ requestedPage, count, rows: data ?? [] });
 *   …
 *   <Pagination currentPage={p.currentPage} totalPages={p.totalPages} … />
 */
export const PAGE_SIZE = 24;

export function parsePage(raw: string | string[] | undefined): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = Number(s);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

export type PaginationState = {
  /** Page actually being shown — clamped to [1, totalPages]. Will differ from
   *  the URL's `?page=` if the user typed `?page=999`. */
  currentPage: number;
  totalPages: number;
  /** Offset to pass to `.range(offset, offset + size - 1)`. Note: this is
   *  derived from the *requested* page, not the clamped one — because the
   *  query has already happened by the time we know `totalPages`. */
  offset: number;
  pageSize: number;
  count: number;
  /** 1-indexed inclusive bounds for the human-readable "Showing N–M of K" line. */
  firstIdx: number;
  lastIdx: number;
};

export function paginate({
  requestedPage,
  count,
  rows,
  pageSize = PAGE_SIZE,
}: {
  requestedPage: number;
  count: number | null;
  rows: { length: number };
  pageSize?: number;
}): PaginationState {
  const c = count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(c / pageSize));
  const currentPage = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (requestedPage - 1) * pageSize;
  const firstIdx = c === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastIdx = (currentPage - 1) * pageSize + rows.length;
  return { currentPage, totalPages, offset, pageSize, count: c, firstIdx, lastIdx };
}
