'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteProduct } from './actions';

export default function DeleteButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    start(async () => {
      await deleteProduct(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
    >
      {pending ? 'Deleting…' : 'Delete'}
    </button>
  );
}
