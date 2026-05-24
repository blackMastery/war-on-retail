import { createClient } from '@/lib/supabase/server';
import CategoryCard from '@/components/customer/CategoryCard';

export const revalidate = 300;
export const metadata = { title: 'All Categories' };

export default async function CategoriesIndexPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .is('parent_id', null)
    .order('display_order');

  return (
    <div className="container py-10">
      <h1 className="mb-6 text-2xl font-bold">Browse categories</h1>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {categories?.map((c) => <CategoryCard key={c.id} category={c} />)}
      </div>
    </div>
  );
}
