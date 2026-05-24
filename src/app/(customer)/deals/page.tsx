import { createClient } from '@/lib/supabase/server';
import ProductGrid from '@/components/customer/ProductGrid';

export const revalidate = 60;
export const metadata = { title: 'Deals' };

export default async function DealsPage() {
  const supabase = await createClient();

  // "Deal" = a product where compare_at_price is set and greater than price.
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('is_active', true)
    .not('compare_at_price', 'is', null)
    .order('created_at', { ascending: false })
    .limit(48);

  const onSale = (products ?? []).filter(
    (p) => p.compare_at_price && p.compare_at_price > p.price,
  );

  return (
    <main className="container py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">🔥 Today's deals</h1>
        <p className="mt-1 text-gray-600">Live discounts across our catalogue.</p>
      </header>
      <ProductGrid products={onSale} />
    </main>
  );
}
