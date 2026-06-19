import CustomerAuthForm from './CustomerAuthForm';

export const metadata = { title: 'Sign in' };

export default async function CustomerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="container flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-sm ring-1 ring-border">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to track your orders and save your wishlist.
        </p>
        <div className="mt-6">
          <CustomerAuthForm next={next} />
        </div>
      </div>
    </div>
  );
}
