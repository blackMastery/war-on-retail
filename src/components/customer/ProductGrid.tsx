import ProductCard from './ProductCard';
import { StaggerIn, StaggerItem } from './motion/primitives';
import type { Product } from '@/types/database';

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        No products to show yet.
      </div>
    );
  }
  return (
    // StaggerIn is a client boundary that streams the (server-rendered) cards in
    // with a subtle staggered fade-rise on first view. Reduced-motion users get
    // them instantly (MotionConfig), and SSR still emits the full markup. Each
    // item stretches so cards keep equal heights in the grid.
    <StaggerIn className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <StaggerItem key={p.id} className="flex">
          <ProductCard product={p} className="h-full w-full" />
        </StaggerItem>
      ))}
    </StaggerIn>
  );
}
