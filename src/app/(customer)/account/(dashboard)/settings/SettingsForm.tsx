'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

const MIN_LEN = 8;
const inputClass =
  'mt-1 block w-full rounded-md border-border shadow-sm focus:border-ring focus:ring-ring text-sm';

type Feedback = { kind: 'ok' | 'error'; msg: string } | null;

const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;

export default function SettingsForm({
  email,
  initialName,
  initialPhone,
}: {
  email: string;
  initialName: string;
  initialPhone: string;
}) {
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [nameStatus, setNameStatus] = useState<'idle' | 'pending'>('idle');
  const [nameFeedback, setNameFeedback] = useState<Feedback>(null);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [pwStatus, setPwStatus] = useState<'idle' | 'pending'>('idle');
  const [pwFeedback, setPwFeedback] = useState<Feedback>(null);

  async function onSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setNameFeedback(null);
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      setNameFeedback({ kind: 'error', msg: 'Name is required.' });
      return;
    }
    if (trimmedPhone && !PHONE_RE.test(trimmedPhone)) {
      setNameFeedback({
        kind: 'error',
        msg: 'Enter a valid phone number (digits, spaces, + and ( ) allowed), or leave it blank.',
      });
      return;
    }
    setNameStatus('pending');
    const supabase = createClient();

    // Phone first — it may claim/rename/create the customer row that the name
    // update below then writes to. Skipped when left blank (phone can't be
    // cleared — it's the dedup key).
    if (trimmedPhone && trimmedPhone !== initialPhone) {
      const { error: phoneError } = await supabase.rpc('set_my_phone', { p_phone: trimmedPhone });
      if (phoneError) {
        setNameStatus('idle');
        const taken = phoneError.message?.includes('PHONE_TAKEN');
        setNameFeedback({
          kind: 'error',
          msg: taken
            ? 'That phone number is already linked to another account.'
            : phoneError.message,
        });
        return;
      }
    }

    // Auth metadata is the profile source of truth; the RPC keeps any linked
    // customer rows (what admins + receipts see) in step.
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmedName } });
    if (error) {
      setNameStatus('idle');
      setNameFeedback({ kind: 'error', msg: error.message });
      return;
    }
    const { error: rpcError } = await supabase.rpc('update_my_profile', { p_name: trimmedName });
    if (rpcError) {
      // Non-fatal: the auth name updated; surface but don't lose the success.
      console.error('[settings] update_my_profile failed', rpcError);
    }
    setNameStatus('idle');
    setNameFeedback({ kind: 'ok', msg: 'Profile updated.' });
    router.refresh();
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwFeedback(null);
    if (password.length < MIN_LEN) {
      setPwFeedback({ kind: 'error', msg: `Password must be at least ${MIN_LEN} characters.` });
      return;
    }
    if (password !== confirm) {
      setPwFeedback({ kind: 'error', msg: 'Passwords do not match.' });
      return;
    }
    setPwStatus('pending');
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setPwStatus('idle');
      setPwFeedback({ kind: 'error', msg: error.message });
      return;
    }
    setPwStatus('idle');
    setPassword('');
    setConfirm('');
    setPwFeedback({ kind: 'ok', msg: 'Password changed.' });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-semibold">Profile</h2>
        <form onSubmit={onSaveProfile} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary-foreground">Email</label>
            <input
              type="email"
              value={email}
              disabled
              className={`${inputClass} bg-muted text-muted-foreground`}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Your sign-in email can&apos;t be changed here yet.
            </p>
          </div>
          <div>
            <label htmlFor="display-name" className="block text-sm font-medium text-secondary-foreground">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-secondary-foreground">
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+592 600 0000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              We use this to confirm orders and prefill checkout.
            </p>
          </div>
          <Feedback feedback={nameFeedback} />
          <button
            type="submit"
            disabled={nameStatus === 'pending'}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {nameStatus === 'pending' ? 'Saving…' : 'Save'}
          </button>
        </form>
      </section>

      <section className="rounded-lg bg-card p-5 shadow-sm ring-1 ring-border">
        <h2 className="text-lg font-semibold">Change password</h2>
        <form onSubmit={onChangePassword} className="mt-4 space-y-4">
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-secondary-foreground">
              New password
            </label>
            <input
              id="new-password"
              type="password"
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
              autoComplete="new-password"
              minLength={MIN_LEN}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
            />
          </div>
          <Feedback feedback={pwFeedback} />
          <button
            type="submit"
            disabled={pwStatus === 'pending'}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
          >
            {pwStatus === 'pending' ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}

function Feedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  if (feedback.kind === 'ok') {
    return (
      <p className="flex items-start gap-2 rounded-md bg-green-50 p-3 text-sm text-green-800">
        <CheckCircleIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{feedback.msg}</span>
      </p>
    );
  }
  return (
    <p className="flex items-start gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
      <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{feedback.msg}</span>
    </p>
  );
}
