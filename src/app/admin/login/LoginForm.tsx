'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setErrorMsg('');
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/admin/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ''
    }`;
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
        Check <span className="font-semibold">{email}</span> for a sign-in link. You can close this
        tab.
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@waronretail.com"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>
      {status === 'error' && (
        <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-md bg-primary-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
      >
        {status === 'sending' ? 'Sending…' : 'Email me a magic link'}
      </button>
    </form>
  );
}
