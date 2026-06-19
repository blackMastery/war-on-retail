import ProductCard from './ProductCard';
import { StaggerIn, StaggerItem } from './motion/primitives';
import type { Product } from '@/types/database';

export default function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <section
        aria-label="Products"
        className="rounded-lg border border-dashed border-border bg-card p-12 text-center text-muted-foreground"
      >
        No products to show yet.
      </section>
    );
  }
  return (
    // StaggerIn is a client boundary that streams the (server-rendered) cards in
    // with a subtle staggered fade-rise on first view. Reduced-motion users get
    // them instantly (MotionConfig), and SSR still emits the full markup. Each
    // item stretches so cards keep equal heights in the grid.
    <section aria-label="Products">
      <StaggerIn className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((p) => (
          <StaggerItem key={p.id} className="flex">
            <ProductCard product={p} className="h-full w-full" />
          </StaggerItem>
        ))}
      </StaggerIn>
    </section>
  );
}
