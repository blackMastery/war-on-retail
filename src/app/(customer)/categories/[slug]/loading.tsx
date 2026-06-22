import ProductGridSkeleton from '@/components/customer/ProductGridSkeleton';

export default function Loading() {
  return (
    <div className="container py-10">
      <header className="mb-6 animate-pulse">
        <div className="h-8 w-56 rounded bg-muted" />
        <div className="mt-2 h-4 w-80 rounded bg-muted" />
        <div className="mt-3 h-4 w-32 rounded bg-muted" />
      </header>
      <ProductGridSkeleton
        count={12}
        gridClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4"
      />
    </div>
  );
}
