'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'reset';
type Status = 'idle' | 'pending' | 'sent' | 'error';

const inputClass =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

/**
 * Customer sign-in form. Mirrors the admin LoginForm:
 *   - Primary: email + password via `signInWithPassword`. On success we link
 *     any guest customer rows that share this (now verified) email, then
 *     navigate to the requested page.
 *   - Secondary: "Forgot password?" sends a reset email that lands on
 *     `/auth/callback?next=/account/reset-password`.
 */
export default function CustomerAuthForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function onSignIn(e: React.FormEvent) {
    e.preventDefault();
    setStatus('pending');
    setErrorMsg('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }
    // Verified session now exists — link any guest customer rows by email.
    await supabase.rpc('link_customer_account');
    router.push(next ?? '/account');
    router.refresh();
  }

  async function onSendReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus('pending');
    setErrorMsg('');
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      '/account/reset-password',
    )}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
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
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
          <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Check <span className="font-semibold">{email}</span> for a password-reset link.
            You can close this tab.
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setStatus('idle');
            setPassword('');
          }}
          className="text-sm font-medium text-link-on-light hover:underline"
        >
          ← Back to sign in
        </button>
      </div>
    );
  }

  if (mode === 'reset') {
    return (
      <form onSubmit={onSendReset} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium text-secondary-foreground">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>
        {status === 'error' && (
          <p className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
            <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setStatus('idle');
              setErrorMsg('');
            }}
            className="text-sm font-medium text-link-on-light hover:underline"
          >
            ← Back to sign in
          </button>
          <button
            type="submit"
            disabled={status === 'pending'}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {status === 'pending' ? 'Sending…' : 'Send reset email'}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onSignIn} className="space-y-4">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        {status === 'pending' ? 'Signing in…' : 'Sign in'}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setMode('reset');
            setStatus('idle');
            setErrorMsg('');
          }}
          className="font-medium text-link-on-light hover:underline"
        >
          Forgot your password?
        </button>
        <Link
          href={next ? `/account/signup?next=${encodeURIComponent(next)}` : '/account/signup'}
          className="font-medium text-link-on-light hover:underline"
        >
          Create an account
        </Link>
      </div>
    </form>
  );
}
