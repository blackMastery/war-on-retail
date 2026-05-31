'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'reset';
type Status = 'idle' | 'pending' | 'sent' | 'error';

/**
 * Admin sign-in form.
 *
 * Primary flow: email + password via `signInWithPassword`. The `@supabase/ssr`
 * browser client sets the session cookies synchronously, so on success we can
 * `router.push(next)` immediately — no callback round-trip needed.
 *
 * Secondary flow: "Forgot password?" sends a Supabase password-reset email.
 * The link in that email lands at `/admin/auth/callback?next=/admin/auth/reset-password`,
 * which exchanges the code, establishes a session, and forwards the user to
 * the page where they type a new password.
 */
export default function LoginForm({ next }: { next?: string }) {
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
    // Cookies are set; navigate to the requested page and force the server
    // components above to re-render against the new session.
    router.push(next ?? '/admin');
    router.refresh();
  }

  async function onSendReset(e: React.FormEvent) {
    e.preventDefault();
    setStatus('pending');
    setErrorMsg('');
    const supabase = createClient();
    // The reset email needs to land on a page that already has a session,
    // because `updateUser({ password })` requires one. We route the email's
    // link through the existing OAuth/OTP callback so the code-exchange step
    // is unchanged, then the callback forwards to the set-password page.
    const redirectTo = `${window.location.origin}/admin/auth/callback?next=${encodeURIComponent(
      '/admin/auth/reset-password',
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
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-800">
          Check <span className="font-semibold">{email}</span> for a password-reset
          link. You can close this tab.
        </div>
        <button
          type="button"
          onClick={() => {
            setMode('signin');
            setStatus('idle');
            setPassword('');
          }}
          className="text-sm font-medium text-primary-600 hover:underline"
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
          <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@waronretail.com"
            className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
        {status === 'error' && (
          <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
        )}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setStatus('idle');
              setErrorMsg('');
            }}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            ← Back to sign in
          </button>
          <button
            type="submit"
            disabled={status === 'pending'}
            className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
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
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@waronretail.com"
          className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
          className="font-medium text-primary-600 hover:underline"
        >
          Forgot your password?
        </button>
        <Link href="/" className="text-gray-500 hover:underline">
          Back to site
        </Link>
      </div>
    </form>
  );
}
