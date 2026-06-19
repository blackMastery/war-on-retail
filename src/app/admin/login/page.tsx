import LoginForm from './LoginForm';
import { ADMIN_ALERT_ON_CARD } from '@/lib/admin/tokens';

export const metadata = { title: 'Admin login' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-md ring-1 ring-border">
        <h1 className="text-2xl font-bold">War on Retail — Admin</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in with the email and password set up for your admin account.
        </p>
        {error && (
          <p className={`mt-4 ${ADMIN_ALERT_ON_CARD.error}`}>
            {error === 'not-authorised'
              ? 'That email is not authorised to access /admin.'
              : 'Sign-in error. Please try again.'}
          </p>
        )}
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
