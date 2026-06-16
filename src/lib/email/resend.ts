import 'server-only';
import { Resend } from 'resend';

/**
 * Lazily-built Resend client. Returns `null` when `RESEND_API_KEY` is unset so
 * callers can fall back to dev "log-only" mode instead of crashing — the store
 * can develop and test the whole email flow before a Resend account exists.
 *
 * Cached across calls within a server process once built.
 */
let cached: Resend | null = null;

export function getResend(): Resend | null {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  cached = new Resend(key);
  return cached;
}

/** Sender + reply-to, env-overridable. Falls back to the documented defaults. */
export const EMAIL_FROM = process.env.EMAIL_FROM ?? 'noreply@waronretail.com';
export const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO ?? 'support@waronretail.com';
