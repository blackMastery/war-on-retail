import { createClient } from '@/lib/supabase/server';
import BrandCard from '@/components/customer/BrandCard';

export const revalidate = 300;
export const metadata = { title: 'All Brands' };

export default async function BrandsIndexPage() {
  const supabase = await createClient();
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .eq('is_active', true)
    .order('display_order');

  return (
    <main className="container py-10">
      <h1 className="mb-6 text-2xl font-bold">Brands we carry</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {brands?.map((b) => <BrandCard key={b.id} brand={b} />)}
      </div>
    </main>
  );
}
