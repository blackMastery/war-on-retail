'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const MIN_LEN = 8;

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
    // Session is still valid after the password change — straight to the panel.
    router.push('/admin');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700">
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
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
        <p className="mt-1 text-xs text-gray-500">At least {MIN_LEN} characters.</p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
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
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>
      {status === 'error' && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'pending'}
        className="w-full rounded-md bg-primary-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
      >
        {status === 'pending' ? 'Saving…' : 'Save and continue'}
      </button>
    </form>
  );
}
