import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * OAuth / OTP callback. Supabase redirects here with a `code` (and the original
 * `next` path we passed at sign-in). We exchange the code for a session and then
 * forward to the requested page.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/admin';

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/login?error=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/admin/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
