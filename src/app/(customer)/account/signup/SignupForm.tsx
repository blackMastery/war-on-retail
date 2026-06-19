'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ExclamationTriangleIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

type Status = 'idle' | 'pending' | 'sent' | 'error';

const MIN_LEN = 8;
const inputClass =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

/**
 * Customer sign-up. Email confirmation is on, so a successful `signUp` doesn't
 * sign the user in — it sends a confirmation email whose link lands on
 * `/auth/callback?next=/account` (which exchanges the code and links any
 * matching guest customer rows). We show a "check your email" state.
 */
export default function SignupForm({ next }: { next?: string }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < MIN_LEN) {
      setStatus('error');
      setErrorMsg(`Password must be at least ${MIN_LEN} characters.`);
      return;
    }
    setStatus('pending');
    const supabase = createClient();
    const emailRedirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next ?? '/account',
    )}`;
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo,
        data: { full_name: fullName.trim() },
      },
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
      <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
        <EnvelopeIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Almost there — check <span className="font-semibold">{email}</span> for a link to
          confirm your account. Once confirmed you&apos;ll be signed in automatically.
        </span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="full-name" className="block text-sm font-medium text-secondary-foreground">
          Full name
        </label>
        <input
          id="full-name"
          type="text"
          required
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-secondary-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className={inputClass}
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-secondary-foreground">
          Password
        </label>
        <input
          id="password"
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
        {status === 'pending' ? 'Creating account…' : 'Create account'}
      </button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href={next ? `/account/login?next=${encodeURIComponent(next)}` : '/account/login'}
          className="font-medium text-link-on-light hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
