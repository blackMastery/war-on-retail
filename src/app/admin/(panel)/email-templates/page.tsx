import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import DeleteTemplateButton from './DeleteTemplateButton';

export const metadata = { title: 'Admin · Email templates' };

const STATUS_STYLE: Record<string, string> = {
  sent: 'bg-green-100 text-green-800',
  logged: 'bg-amber-100 text-amber-800',
  failed: 'bg-red-100 text-red-700',
};

export default async function AdminEmailTemplatesPage() {
  const supabase = createAdminClient();

  const [{ data: templates }, { data: logs }] = await Promise.all([
    supabase.from('email_templates').select('*').order('is_system', { ascending: false }).order('name'),
    supabase
      .from('email_log')
      .select('id, created_at, to_email, template_slug, status, subject')
      .order('created_at', { ascending: false })
      .limit(25),
  ]);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">Email templates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Edit the wording of every email the store sends. System templates back the automatic
            order emails; you can also create your own.
          </p>
        </div>
        <Link
          href="/admin/email-templates/new"
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          + New template
        </Link>
      </header>

      <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Subject</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(templates ?? []).map((t) => (
              <tr key={t.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{t.slug}</td>
                <td className="max-w-xs truncate px-4 py-3 text-gray-600">{t.subject}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">{t.is_system ? 'System' : 'Custom'}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      t.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {t.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3 text-xs">
                    <Link
                      href={`/admin/email-templates/${t.id}/edit`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Edit
                    </Link>
                    {!t.is_system && <DeleteTemplateButton id={t.id} name={t.name} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent emails</h2>
        {(!logs || logs.length === 0) ? (
          <p className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
            No emails sent yet. (Without a RESEND_API_KEY, sends are recorded as “logged”.)
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg bg-white shadow-sm ring-1 ring-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      {new Date(l.created_at).toLocaleString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-gray-900">{l.to_email}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {l.template_slug ?? '—'}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-gray-600">{l.subject}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLE[l.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
