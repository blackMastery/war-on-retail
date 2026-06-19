import 'server-only';
import { redirect } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import type { CustomerRow } from '@/types/database';

/**
 * Resolved context for a signed-in customer: the auth user, any customer rows
 * linked to them (a user can own several phone-keyed rows that share an email),
 * and a best-effort display name.
 *
 * Unlike `/admin`, there's no authorisation layer — any confirmed Supabase user
 * is a valid customer. The dashboard simply needs a session. Customer rows are
 * read via RLS (the "customer reads own row" policy), so this honours the
 * session's own permissions rather than using the service role.
 */
export type CustomerContext = {
  user: User;
  /** Linked customer rows. Empty until they place an order or match by email. */
  customers: CustomerRow[];
  /** From user_metadata.full_name, falling back to a linked customer's name, then the email local-part. */
  displayName: string;
};

function resolveDisplayName(user: User, customers: CustomerRow[]): string {
  const metaName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';
  if (metaName) return metaName;
  const fromCustomer = customers.find((c) => c.name?.trim())?.name?.trim();
  if (fromCustomer) return fromCustomer;
  return user.email?.split('@')[0] ?? 'there';
}

/**
 * Non-throwing context fetch. Returns null when there's no session. Used where
 * we want to render differently for guests vs signed-in customers.
 */
export async function getCustomerContext(): Promise<CustomerContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('[customer/auth] linked customers lookup failed', error);
  }

  const rows = customers ?? [];
  return { user, customers: rows, displayName: resolveDisplayName(user, rows) };
}

/**
 * Guard for the customer dashboard. Redirects to the login page when there's no
 * session. Use at the top of the dashboard layout / server actions.
 */
export async function requireCustomer(): Promise<CustomerContext> {
  const ctx = await getCustomerContext();
  if (!ctx) redirect('/account/login');
  return ctx;
}
