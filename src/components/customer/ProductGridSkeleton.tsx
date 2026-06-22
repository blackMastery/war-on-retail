import ProductCardSkeleton from './ProductCardSkeleton';

/**
 * Grid of skeleton placeholders matching `<ProductGrid>`'s breakpoints exactly.
 * Default count of 8 fills the first viewport at all breakpoints without
 * over-rendering: 2 cols × 4 rows on mobile, 3 × 3 on lg, 4 × 2 on xl.
 *
 * `animate-pulse` lives here (not on each card) so 24 cards animate as one
 * compositor layer instead of 24, which is materially cheaper on low-end
 * Android devices.
 */
export default function ProductGridSkeleton({
  count = 8,
  gridClassName = 'grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4',
}: {
  count?: number;
  /** Override the grid layout classes. Should match the paired `<ProductGrid>`. */
  gridClassName?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Loading products"
      className={`animate-pulse ${gridClassName}`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading products…</span>
    </div>
  );
}
