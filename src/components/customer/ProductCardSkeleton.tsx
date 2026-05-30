/**
 * Skeleton placeholder mirroring `<ProductCard>`'s shape.
 *
 * Used by:
 *   - `loading.tsx` files for the product-list routes (Next.js shows these via
 *     Suspense while the server component fetches data)
 *   - Any client component that wants a non-CLS placeholder before its products
 *     have hydrated
 *
 * Layout intentionally matches ProductCard 1:1 so the swap-in is visually
 * smooth — same aspect ratio for the image, same body padding, same height
 * minimums on the title block.
 *
 * Not animated via `animate-pulse` per-card to keep CPU low on grids of 24;
 * the parent `<ProductGridSkeleton>` applies `animate-pulse` once to the whole
 * grid container instead.
 */
export default function ProductCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
    >
      <div className="aspect-square bg-gray-200" />
      <div className="flex flex-1 flex-col p-4">
        <div className="h-4 w-3/4 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-1/2 rounded bg-gray-200" />
        <div className="mt-3 h-5 w-1/3 rounded bg-gray-200" />
        <div className="mt-auto pt-3">
          <div className="h-8 w-full rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
