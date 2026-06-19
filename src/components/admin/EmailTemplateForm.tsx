'use client';

import { useActionState, useState } from 'react';
import { upsertTemplate, type TemplateFormState } from '@/app/admin/(panel)/email-templates/actions';
import EmailHtmlEditor from '@/components/admin/EmailHtmlEditor';
import type { EmailBrand } from '@/lib/email/render';
import type { EmailTemplateRow } from '@/types/database';

const initial: TemplateFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

export default function EmailTemplateForm({
  template,
  brand,
}: {
  template?: EmailTemplateRow;
  brand: EmailBrand;
}) {
  const [state, action, pending] = useActionState(upsertTemplate, initial);
  const [subject, setSubject] = useState(template?.subject ?? '');
  const err = (k: string) => state.fieldErrors?.[k];
  const isSystem = template?.is_system ?? false;

  return (
    <form action={action} className="space-y-6">
      {template?.id && <input type="hidden" name="id" value={template.id} />}

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <section className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">Basics</h2>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Name</span>
          <input
            name="name"
            required
            defaultValue={template?.name}
            placeholder="e.g. Order confirmation"
            className={INPUT}
          />
          {err('name') && <span className="mt-1 block text-xs text-red-600">{err('name')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">
            Slug{' '}
            <span className="font-normal text-muted-foreground">
              {template ? '(fixed)' : '(optional)'}
            </span>
          </span>
          {template ? (
            <input
              value={template.slug}
              readOnly
              className={`${INPUT} bg-muted font-mono text-muted-foreground`}
            />
          ) : (
            <input
              name="slug"
              placeholder="auto-generated from name"
              className={INPUT}
            />
          )}
          <span className="mt-1 block text-xs text-muted-foreground">
            {isSystem
              ? 'System template — used to send the automatic order email of the same name. Editable, but cannot be renamed or deleted.'
              : 'Stable key used to reference this template in code/sends. Cannot be changed after creation.'}
          </span>
          {err('slug') && <span className="mt-1 block text-xs text-red-600">{err('slug')}</span>}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Subject</span>
          <input
            name="subject"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="We received your order {{order_number}}"
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            You can use variables here too, e.g. <code>{'{{order_number}}'}</code>.
          </span>
          {err('subject') && (
            <span className="mt-1 block text-xs text-red-600">{err('subject')}</span>
          )}
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={template?.is_active ?? true}
            className="rounded text-primary"
          />
          Active (system templates only auto-send when active)
        </label>
      </section>

      <section className="space-y-3 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">Email body</h2>
        <EmailHtmlEditor
          name="body_html"
          defaultValue={template?.body_html ?? ''}
          subject={subject}
          brand={brand}
        />
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : template ? 'Save changes' : 'Create template'}
        </button>
      </div>
    </form>
  );
}
