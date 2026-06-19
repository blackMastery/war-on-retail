'use client';

import { useActionState } from 'react';
import { sendTestTemplate, type TestSendState } from './actions';

const initial: TestSendState = {};

/**
 * "Send test to…" — delivers the saved template to an address using sample
 * data. Surfaces whether it was actually sent or just logged (dev fallback).
 */
export default function TestSendForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState(sendTestTemplate, initial);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="slug" value={slug} />
      <div className="flex flex-wrap items-center gap-2">
        <input
          name="to"
          type="email"
          required
          placeholder="you@example.com"
          className="flex-1 rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-semibold text-secondary-foreground hover:bg-muted disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send test'}
        </button>
      </div>
      {state.ok && <p className="text-xs text-green-700">{state.ok}</p>}
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
