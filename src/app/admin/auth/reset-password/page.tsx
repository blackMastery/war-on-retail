import ResetPasswordForm from './ResetPasswordForm';

export const metadata = { title: 'Set a new password' };

/**
 * Lands here AFTER `/admin/auth/callback?next=/admin/auth/reset-password`
 * has exchanged the password-reset code for a session. The form below uses
 * `supabase.auth.updateUser({ password })`, which requires that session.
 *
 * If the user reached this URL without first going through the reset email
 * (e.g. they typed the URL directly), `updateUser` will fail with "Auth
 * session missing" and we'll surface the error inline — no extra guarding
 * needed.
 */
export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-md ring-1 ring-border">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a password you haven&apos;t used here before. You&apos;ll be signed in
          right after.
        </p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </main>
  );
}
