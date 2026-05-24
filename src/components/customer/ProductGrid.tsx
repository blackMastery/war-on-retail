import ProductCard from './ProductCard';
import type { Product } from '@/types/database';

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        No products to show yet. Add some via the{' '}
        <a href="/admin/products" className="font-medium text-primary-600 hover:underline">
          admin panel
        </a>
        .
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
