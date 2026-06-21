import SignupForm from './SignupForm';

export const metadata = { title: 'Create an account' };

export default async function CustomerSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="container flex justify-center py-12">
      <div className="w-full max-w-md rounded-lg bg-card p-8 shadow-sm ring-1 ring-border">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Save your cart and wishlist and keep all your orders in one place. You can still check out
          as a guest any time.
        </p>
        <div className="mt-6">
          <SignupForm next={next} />
        </div>
      </div>
    </div>
  );
}
