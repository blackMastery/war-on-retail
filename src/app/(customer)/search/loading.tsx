import ProductGridSkeleton from '@/components/customer/ProductGridSkeleton';

export default function Loading() {
  return (
    <div className="container py-10">
      <header className="mb-6 animate-pulse">
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="mt-2 h-4 w-40 rounded bg-gray-200" />
      </header>
      <ProductGridSkeleton count={8} />
    </div>
  );
}
