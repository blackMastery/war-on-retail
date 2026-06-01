'use client';

import { useState, useTransition } from 'react';
import { updateOrderNotes } from '../actions';

export default function OrderNotesForm({
  orderId,
  initial,
}: {
  orderId: string;
  initial: string;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  function onSave() {
    start(async () => {
      try {
        await updateOrderNotes(orderId, value);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      } catch (e) {
        alert(e instanceof Error ? e.message : 'Could not save notes.');
      }
    });
  }

  return (
    <div className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <h2 className="font-semibold">Internal notes</h2>
      <p className="mt-1 text-xs text-gray-500">
        Only visible to admins. Useful for tracking conversations, special
        requests, or delivery instructions.
      </p>
      <textarea
        rows={5}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Customer called — wants delivery on Thursday afternoon."
        className="mt-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
      />
      <div className="mt-3 flex items-center justify-end gap-3">
        {saved && (
          <span className="text-sm text-green-700" role="status">
            ✓ Saved
          </span>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save notes'}
        </button>
      </div>
    </div>
  );
}
