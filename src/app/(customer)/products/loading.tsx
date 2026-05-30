import ProductGridSkeleton from '@/components/customer/ProductGridSkeleton';

/**
 * Loading UI for `/products` and any of its filter/page query variants.
 *
 * Layout mirrors page.tsx: a heading row, a sidebar column on `lg+`, and a
 * grid of skeleton cards. The sidebar block is rendered as a single tall
 * placeholder rather than skeleton-ing every filter group — the filters
 * hydrate from server props instantly once the navigation resolves, so a
 * single shimmer is enough to communicate "filters incoming".
 */
export default function Loading() {
  return (
    <div className="container py-6 sm:py-8">
      <header className="mb-6 animate-pulse">
        <div className="h-7 w-48 rounded bg-gray-200 sm:h-8" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-200" />
      </header>

      <div className="grid gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <div className="hidden lg:block">
          <div className="h-[32rem] animate-pulse rounded-lg bg-gray-100" />
        </div>
        <div className="min-w-0">
          <ProductGridSkeleton count={12} />
        </div>
      </div>
    </div>
  );
}
