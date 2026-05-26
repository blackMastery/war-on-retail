'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deletePromotion } from './actions';

export default function DeleteButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    start(async () => {
      await deletePromotion(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
