import LoginForm from './LoginForm';

export const metadata = { title: 'Admin login' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md ring-1 ring-gray-200">
        <h1 className="text-2xl font-bold">War on Retail — Admin</h1>
        <p className="mt-1 text-sm text-gray-600">
          Sign in with the email on your allow-list. We'll send you a magic link.
        </p>
        {error && (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
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
