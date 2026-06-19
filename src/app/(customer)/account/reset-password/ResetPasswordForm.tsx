'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

const MIN_LEN = 8;
const inputClass =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

/**
 * Reached AFTER `/auth/callback?next=/account/reset-password` exchanges the
 * reset code for a session — `updateUser({ password })` requires that session.
 * If someone types this URL directly with no session, updateUser surfaces an
 * "Auth session missing" error inline.
 */
export default function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<'idle' | 'pending' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < MIN_LEN) {
      setStatus('error');
      setErrorMsg(`Password must be at least ${MIN_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setErrorMsg('Passwords do not match.');
      return;
    }
    setStatus('pending');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    router.push('/account');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-secondary-foreground">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_LEN}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-muted-foreground">At least {MIN_LEN} characters.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-secondary-foreground">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          minLength={MIN_LEN}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={inputClass}
        />
      </div>
      {status === 'error' && (
        <p className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'pending'}
        className="w-full rounded-md bg-primary text-primary-foreground px-4 py-2 font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
      >
        {status === 'pending' ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  );
}
