import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Customer auth callback. Supabase redirects here for both email-confirmation
 * and password-reset links, with a `code` and the `next` path we set when the
 * email was triggered. We exchange the code for a session, link any guest
 * customer rows that match this now-verified email, then forward.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/account';

  if (!code) {
    return NextResponse.redirect(`${origin}/account/login?error=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/account/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // Best-effort: link existing guest customer rows by verified email. Never
  // block the redirect on this.
  const { error: linkError } = await supabase.rpc('link_customer_account');
  if (linkError) {
    console.error('[account/callback] link_customer_account failed', linkError);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
