import { createAdminClient } from '@/lib/supabase/admin';
import CategoryForm from '@/components/admin/CategoryForm';

export const metadata = { title: 'Admin · New category' };

export default async function NewCategoryPage() {
  const supabase = createAdminClient();
  const { data: allCategories } = await supabase
    .from('categories')
    .select('id, name, slug, parent_id')
    .order('display_order')
    .order('name');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New category</h1>
      <CategoryForm allCategories={allCategories ?? []} />
    </div>
  );
}
