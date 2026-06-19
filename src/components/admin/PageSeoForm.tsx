'use client';

import { useActionState } from 'react';
import {
  upsertPageSeo,
  type PageSeoFormState,
} from '@/app/admin/(panel)/pages/actions';
import MarkdownEditor from '@/components/admin/MarkdownEditor';
import type { PageSeo } from '@/types/database';

const initial: PageSeoFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

/**
 * Which page rows have a customer-facing Markdown body the admin can edit.
 * Other rows (home, products list, cart, etc.) render their own JSX and the
 * body field stays hidden to keep the form un-cluttered.
 */
const EDITABLE_BODY_PAGE_IDS = new Set<string>([
  'about',
  'policies-privacy',
  'policies-shipping',
  'policies-terms',
  'policies-warranty',
]);

export default function PageSeoForm({ page }: { page: PageSeo }) {
  const [state, action, pending] = useActionState(upsertPageSeo, initial);
  const err = (k: string) => state.fieldErrors?.[k];
  const supportsBody = EDITABLE_BODY_PAGE_IDS.has(page.id);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={page.id} />

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}

      <section className="space-y-1 rounded-lg bg-muted p-5 ring-1 ring-border text-sm">
        <p>
          <span className="font-medium text-secondary-foreground">Route:</span>{' '}
          <code className="rounded bg-card px-1.5 py-0.5 font-mono text-xs ring-1 ring-border">
            {page.path}
          </code>
        </p>
        <p className="text-xs text-muted-foreground">
          The path is hardcoded in the app — only the metadata below is editable.
        </p>
      </section>

      <section className="space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">SEO metadata</h2>
        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">
            Meta title <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <input
            name="meta_title"
            defaultValue={page.meta_title ?? ''}
            placeholder={`e.g. "${page.label} · War on Retail"`}
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Used as the {`<title>`} tag and in social previews. Leave blank to use
            the default.
          </span>
          {err('meta_title') && (
            <span className="mt-1 block text-xs text-red-600">{err('meta_title')}</span>
          )}
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">
            Meta description <span className="font-normal text-muted-foreground">(optional)</span>
          </span>
          <textarea
            name="meta_description"
            rows={3}
            defaultValue={page.meta_description ?? ''}
            placeholder="One or two sentences for SERPs and social previews."
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Aim for 150–160 characters. Falls back to the site description when blank.
          </span>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">
            Meta keywords <span className="font-normal text-muted-foreground">(optional, comma-separated)</span>
          </span>
          <input
            name="meta_keywords"
            defaultValue={page.meta_keywords ?? ''}
            placeholder="electronics Guyana, home appliances, deals"
            className={INPUT}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            Bing still uses these; Google ignores them but does not penalise them.
          </span>
        </label>
      </section>

      {supportsBody && (
        <section className="space-y-3 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
          <h2 className="font-semibold">Page content</h2>
          <p className="text-xs text-muted-foreground">
            Use the toolbar for formatting, or type Markdown directly. The
            right pane shows a live preview. Use the placeholders below to
            have store-settings values substituted at render time.
          </p>
          <MarkdownEditor
            name="body_markdown"
            defaultValue={page.body_markdown ?? ''}
            height={520}
          />
          <div className="rounded-md bg-muted p-3 text-xs text-secondary-foreground ring-1 ring-border">
            <p className="font-semibold">Placeholders</p>
            <p className="mt-1 leading-relaxed">
              <code>{`{{site_name}}`}</code> · <code>{`{{site_phone}}`}</code> ·{' '}
              <code>{`{{site_email}}`}</code> ·{' '}
              <code>{`{{site_address}}`}</code> ·{' '}
              <code>{`{{site_whatsapp}}`}</code>
            </p>
            <p className="mt-2 text-muted-foreground">
              Last updated:{' '}
              {new Date(page.updated_at).toLocaleString('en-GY', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-semibold">Search engine indexing</h2>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="robots_index"
            defaultChecked={page.robots_index}
            className="mt-1 rounded text-primary"
          />
          <span>
            Allow search engines to index this page
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Uncheck for transactional pages (cart, checkout, account) — emits
              {' '}
              <code className="rounded bg-muted px-1 font-mono text-[11px]">
                {`<meta name="robots" content="noindex, nofollow">`}
              </code>
              .
            </span>
          </span>
        </label>
      </section>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-primary text-primary-foreground px-5 py-2 font-semibold hover:opacity-90 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
