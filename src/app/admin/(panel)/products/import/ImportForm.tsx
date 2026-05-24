'use client';

import { useActionState } from 'react';
import { importProductsCsv, type ImportResult } from './actions';

const initial: ImportResult = { ok: false, inserted: 0, updated: 0, errors: [] };

export default function ImportForm() {
  const [state, action, pending] = useActionState(importProductsCsv, initial);
  const hasRun = state.inserted > 0 || state.updated > 0 || state.errors.length > 0;

  return (
    <form action={action} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <label className="block">
        <span className="text-sm font-medium text-gray-700">Choose a .csv file</span>
        <input
          type="file"
          name="csv"
          accept=".csv,text/csv"
          required
          className="mt-2 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-primary-700"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
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
            <ul className="max-h-64 overflow-y-auto rounded-md bg-red-50 p-3 text-xs text-red-700">
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
