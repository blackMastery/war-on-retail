'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTemplate } from './actions';

/**
 * Hard-deletes a custom template after confirmation. System templates don't
 * render this button at all (they're protected server-side too).
 */
export default function DeleteTemplateButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    start(async () => {
      try {
        await deleteTemplate(id);
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Could not delete the template.');
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? 'Working…' : 'Delete'}
    </button>
  );
}
