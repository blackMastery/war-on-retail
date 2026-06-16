import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/admin';
import EmailTemplateForm from '@/components/admin/EmailTemplateForm';
import AuditInfo from '@/components/admin/AuditInfo';
import { getEmailBrand } from '@/lib/email/context';
import TestSendForm from '../../TestSendForm';

export const metadata = { title: 'Admin · Edit email template' };

export default async function EditEmailTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: template } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!template) notFound();

  const brand = await getEmailBrand();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Edit · {template.name}</h1>

      <EmailTemplateForm template={template} brand={brand} />

      <section className="space-y-2 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
        <h2 className="font-semibold">Send a test</h2>
        <p className="text-xs text-gray-500">
          Sends this template with sample data. Save your changes first — the test uses the saved
          version.
        </p>
        <TestSendForm slug={template.slug} />
      </section>

      <AuditInfo
        createdBy={template.created_by}
        modifiedBy={template.modified_by}
        createdAt={template.created_at}
        updatedAt={template.updated_at}
      />
    </div>
  );
}
