import EmailTemplateForm from '@/components/admin/EmailTemplateForm';
import { getEmailBrand } from '@/lib/email/context';

export const metadata = { title: 'Admin · New email template' };

export default async function NewEmailTemplatePage() {
  const brand = await getEmailBrand();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New email template</h1>
      <EmailTemplateForm brand={brand} />
    </div>
  );
}
