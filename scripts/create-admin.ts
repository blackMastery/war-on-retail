/**
 * Bootstrap script — creates a Supabase auth user with a known password and
 * promotes them to admin via the `public.make_admin(email)` RPC.
 *
 * Why this exists: with password sign-in (instead of magic links), the first
 * admin needs an `auth.users` row *with a password set* before they can sign
 * in at all. This script handles that single step.
 *
 * Run:
 *   npm run create-admin -- --email a@waronretail.com --password 'StrongPass!1'
 *   # or interactively:
 *   npm run create-admin
 *
 * Requirements:
 *   - .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 *   - The Supabase project's `make_admin` RPC must be migrated
 *     (supabase/migrations/20260101000600_admin_users_auth_link.sql)
 *
 * Security:
 *   - The service-role key reads from process.env only — never logged.
 *   - The password is never echoed back or written to a file. If supplied as
 *     a flag it lives in your shell history; prefer the interactive prompt
 *     (or `read -s`) for production accounts.
 */
import { createClient } from '@supabase/supabase-js';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

// .env.local is loaded by the `--env-file=.env.local` flag wired into the
// npm script (Node 20+). No dotenv dependency needed.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MIN_PASSWORD_LEN = 8;

function fatal(msg: string): never {
  console.error(`\nerror: ${msg}\n`);
  process.exit(1);
}

function parseFlags(argv: string[]): { email?: string; password?: string } {
  const out: { email?: string; password?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === '--email' && v) {
      out.email = v;
      i++;
    } else if (k === '--password' && v) {
      out.password = v;
      i++;
    }
  }
  return out;
}

async function prompt(question: string, opts: { silent?: boolean } = {}): Promise<string> {
  // node:readline doesn't natively mask input, but for an operator-run script
  // we accept the trade-off: visible interactive entry is better than no
  // prompt at all. Operators who care about shoulder-surfing should use
  // --password and clear shell history afterwards.
  const rl = createInterface({ input, output });
  try {
    const ans = await rl.question(question);
    return ans.trim();
  } finally {
    rl.close();
  }
  // The `opts.silent` flag is reserved for a future enhancement.
  void opts;
}

async function main() {
  if (!SUPABASE_URL) fatal('NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
  if (!SERVICE_ROLE_KEY) {
    fatal(
      'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local. Add it from your Supabase project settings; it is server-only.',
    );
  }

  const flags = parseFlags(process.argv.slice(2));
  const email = (flags.email ?? (await prompt('Admin email: '))).trim().toLowerCase();
  if (!email || !email.includes('@')) {
    fatal('Please provide a valid email (e.g. you@waronretail.com).');
  }

  const password = flags.password ?? (await prompt(`Password (min ${MIN_PASSWORD_LEN} chars): `));
  if (!password || password.length < MIN_PASSWORD_LEN) {
    fatal(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
  }

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Create the auth user. `email_confirm: true` skips the confirmation
  //    email so the operator's typed password works on first sign-in.
  const created = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) {
    // Supabase returns "User already registered" for duplicate emails. Send
    // the operator to the password-reset path instead of failing silently.
    if (/already (registered|exists)/i.test(created.error.message)) {
      fatal(
        `${email} already has an auth user. To reset their password, open /admin/login and use "Forgot your password?", or call \`select make_admin('${email}')\` in SQL if they only need promoting.`,
      );
    }
    fatal(`Failed to create auth user: ${created.error.message}`);
  }

  // 2. Promote to admin. The RPC is idempotent (ON CONFLICT … DO UPDATE),
  //    so running this script for an already-promoted user just refreshes
  //    their row.
  const promoted = await sb.rpc('make_admin', { p_email: email });
  if (promoted.error) {
    fatal(
      `Auth user was created, but \`make_admin\` failed: ${promoted.error.message}. Run \`select make_admin('${email}')\` in the SQL editor to finish.`,
    );
  }

  console.log(`\n✓ Created admin ${email}`);
  console.log('  Next: open /admin/login and sign in with the password you just set.\n');
}

main().catch((err) => {
  // Never log the password if it was provided as a flag.
  fatal(err instanceof Error ? err.message : String(err));
});
