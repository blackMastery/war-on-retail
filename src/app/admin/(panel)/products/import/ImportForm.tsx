'use client';

import { useActionState } from 'react';
import { importProductsCsv, type ImportResult } from './actions';
import { ADMIN_ALERT_ON_CARD } from '@/lib/admin/tokens';

const initial: ImportResult = { ok: false, inserted: 0, updated: 0, errors: [] };

export default function ImportForm() {
  const [state, action, pending] = useActionState(importProductsCsv, initial);
  const hasRun = state.inserted > 0 || state.updated > 0 || state.errors.length > 0;

  return (
    <form action={action} className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
      <label className="block">
        <span className="text-sm font-medium text-secondary-foreground">Choose a .csv file</span>
        <input
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:font-semibold file:text-primary-foreground hover:file:opacity-90"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-60"
      >
        {pending ? 'Importing…' : 'Upload and import'}
      </button>

      {hasRun && (
        <div className="mt-5 space-y-2 text-sm">
          <p>
            <strong className="text-green-700">{state.inserted}</strong> inserted ·{' '}
            <strong className="text-blue-700">{state.updated}</strong> updated ·{' '}
            <strong className="text-red-700">{state.errors.length}</strong> errors
          </p>
          {state.errors.length > 0 && (
            <ul className={`max-h-64 overflow-y-auto ${ADMIN_ALERT_ON_CARD.error} text-xs`}>
              {state.errors.map((e, i) => (
                <li key={i}>
                  Row {e.row}: {e.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </form>
  );
}
