import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import CategoryForm from '@/components/admin/CategoryForm';

export const metadata = { title: 'Admin · Edit category' };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: category }, { data: allCategories }] = await Promise.all([
    supabase.from('categories').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('categories')
      .select('id, name, slug, parent_id')
      .order('display_order')
      .order('name'),
  ]);
  if (!category) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {category.name}</h1>
      <CategoryForm category={category} allCategories={allCategories ?? []} />
    </div>
  );
}
