'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDiscountCode } from './actions';

export default function DeleteButton({ id, code }: { id: string; code: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  function onClick() {
    if (!confirm(`Delete code "${code}"? This cannot be undone.`)) return;
    start(async () => {
      await deleteDiscountCode(id);
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
