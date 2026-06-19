import ResetPasswordForm from './ResetPasswordForm';

export const metadata = { title: 'Set a new password' };

export default function CustomerResetPasswordPage() {
  return (
    <div className="container flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-sm ring-1 ring-border">
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a password you haven&apos;t used here before. You&apos;ll be signed in right
          after.
        </p>
        <div className="mt-6">
          <ResetPasswordForm />
        </div>
      </div>
    </div>
  );
}
