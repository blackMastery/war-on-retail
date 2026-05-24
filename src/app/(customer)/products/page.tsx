import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';

export const revalidate = 60;

export const metadata = { title: 'All Products' };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort } = await searchParams;
  const supabase = await createClient();

  let q = supabase.from('products').select('*').eq('is_active', true);
  if (sort === 'price-asc') q = q.order('price', { ascending: true });
  else if (sort === 'price-desc') q = q.order('price', { ascending: false });
  else q = q.order('is_featured', { ascending: false }).order('created_at', { ascending: false });

  const { data: products } = await q.limit(48);

  return (
    <main className="container py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">All products</h1>
        <SortLinks current={sort} />
      </div>
      <ProductGrid products={products ?? []} />
    </main>
  );
}

function SortLinks({ current }: { current?: string }) {
  const opts = [
    { v: '', label: 'Featured' },
    { v: 'price-asc', label: 'Price ↑' },
    { v: 'price-desc', label: 'Price ↓' },
  ];
  return (
    <div className="flex gap-3 text-sm">
      {opts.map((o) => {
        const active = (current ?? '') === o.v;
        const href = o.v ? `/products?sort=${o.v}` : '/products';
        return (
          <a
            key={o.v}
            href={href}
            className={
              active
                ? 'font-semibold text-primary-600'
                : 'text-gray-600 hover:text-primary-600'
            }
          >
            {o.label}
          </a>
        );
      })}
    </div>
  );
}
