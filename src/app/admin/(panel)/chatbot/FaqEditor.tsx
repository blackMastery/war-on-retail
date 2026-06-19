'use client';

import { useActionState, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteFaq, upsertFaq, type FaqFormState } from './actions';
import { ADMIN_ALERT_ON_CARD } from '@/lib/admin/tokens';
import type { FAQ, FAQCategory } from '@/types/database';

const initial: FaqFormState = {};

export default function FaqEditor({
  faqs,
  categories,
}: {
  faqs: FAQ[];
  categories: FAQCategory[];
}) {
  const [editing, setEditing] = useState<FAQ | null>(null);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, action, saving] = useActionState(upsertFaq, initial);

  // After save, drop the form back to "new" mode and refresh.
  const wasSaved = !state.error && saving === false;

  function onDelete(id: string, q: string) {
    if (!confirm(`Delete FAQ "${q}"?`)) return;
    start(async () => {
      await deleteFaq(id);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={action} className="min-w-0 space-y-4 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-bold">{editing ? 'Edit FAQ' : 'New FAQ'}</h2>
        {editing && <input type="hidden" name="id" value={editing.id} />}

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Category</span>
          <select
            name="category_id"
            defaultValue={editing?.category_id ?? ''}
            className="mt-1 block w-full rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
          >
            <option value="">— None —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Question</span>
          <input
            name="question"
            required
            defaultValue={editing?.question ?? ''}
            className="mt-1 block w-full rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Answer</span>
          <textarea
            name="answer"
            required
            rows={4}
            defaultValue={editing?.answer ?? ''}
            className="mt-1 block w-full rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-secondary-foreground">Keywords (comma-separated)</span>
          <input
            name="keywords_csv"
            defaultValue={editing?.keywords?.join(', ') ?? ''}
            placeholder="delivery, shipping, georgetown"
            className="mt-1 block w-full rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={editing?.is_active ?? true}
            className="rounded text-primary"
          />
          Active
        </label>

        {state.error && (
          <div className={ADMIN_ALERT_ON_CARD.error}>{state.error}</div>
        )}
        {wasSaved && editing === null && (
          <div className={ADMIN_ALERT_ON_CARD.success}>FAQ saved.</div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
          >
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create FAQ'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="min-w-0 rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="font-bold">Existing FAQs ({faqs.length})</h2>
        <ul className="mt-3 divide-y divide-border">
          {faqs.length === 0 && <li className="py-3 text-sm text-muted-foreground">No FAQs yet.</li>}
          {faqs.map((f) => (
            <li key={f.id} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{f.question}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{f.answer}</p>
                </div>
                <div className="flex shrink-0 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditing(f)}
                    className="font-medium text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(f.id, f.question)}
                    disabled={pending}
                    className="font-medium text-red-600 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
