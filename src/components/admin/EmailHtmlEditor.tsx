'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { formatPrice } from '@/lib/utils';
import {
  renderTemplate,
  buildSampleVars,
  EMAIL_VARIABLES,
  type EmailBrand,
} from '@/lib/email/render';

const QuillEditor = dynamic(() => import('@/components/admin/QuillEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[360px] items-center justify-center rounded-md border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
      Loading editor…
    </div>
  ),
});

type Props = {
  /** Form field name — the body HTML is submitted via a hidden input. */
  name: string;
  defaultValue?: string;
  /** Live subject (kept in sync from the form) so the preview shows it too. */
  subject?: string;
  /** Real store branding so the preview shell matches what customers receive. */
  brand: EmailBrand;
};

/**
 * Visual email-body editor: WYSIWYG (react-quill-new) + a `{{variable}}` insert
 * palette + a live, branded preview rendered through the same `renderTemplate`
 * the sender uses. The HTML value mirrors into a hidden `<input name>` so the
 * surrounding `<form action>` picks it up via FormData (same pattern as
 * MarkdownEditor).
 */
export default function EmailHtmlEditor({ name, defaultValue = '', subject = '', brand }: Props) {
  const [value, setValue] = useState<string>(defaultValue);
  const [insertSignal, setInsertSignal] = useState<{ token: string; nonce: number }>();
  const [showPreview, setShowPreview] = useState(true);

  const sampleVars = useMemo(() => buildSampleVars((n) => formatPrice(n)), []);

  const previewHtml = useMemo(() => {
    const { html } = renderTemplate(
      { subject: subject || '(no subject)', body_html: value },
      sampleVars,
      brand,
    );
    return html;
  }, [value, subject, sampleVars, brand]);

  function insertVariable(key: string) {
    setInsertSignal((prev) => ({ token: `{{${key}}}`, nonce: (prev?.nonce ?? 0) + 1 }));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-xs font-medium text-gray-500">Insert variable:</span>
        {EMAIL_VARIABLES.map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => insertVariable(v.key)}
            title={v.description}
            className="rounded border border-gray-300 bg-white px-2 py-0.5 font-mono text-xs text-gray-700 hover:border-primary-400 hover:bg-primary-50"
          >
            {`{{${v.key}}}`}
          </button>
        ))}
      </div>

      <div data-color-mode="light" className="rounded-md bg-white">
        <QuillEditor value={value} onChange={setValue} insertSignal={insertSignal} />
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <span className="text-xs text-gray-500">
          Preview uses sample data and your live store branding.
        </span>
        <button
          type="button"
          onClick={() => setShowPreview((s) => !s)}
          className="text-xs font-medium text-primary-600 hover:underline"
        >
          {showPreview ? 'Hide preview' : 'Show preview'}
        </button>
      </div>

      {showPreview && (
        <iframe
          title="Email preview"
          srcDoc={previewHtml}
          className="h-[520px] w-full rounded-md border border-gray-200 bg-gray-100"
        />
      )}
    </div>
  );
}
