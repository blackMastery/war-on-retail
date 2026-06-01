import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import PageSeoForm from '@/components/admin/PageSeoForm';
import type { PageSeo } from '@/types/database';

export const metadata = { title: 'Admin · Edit page' };

export default async function EditPageSeoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: page } = await supabase
    .from('page_seo')
    .select('*')
    .eq('id', id)
    .maybeSingle<PageSeo>();
  if (!page) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {page.label}</h1>
      <PageSeoForm page={page} />
    </div>
  );
}
