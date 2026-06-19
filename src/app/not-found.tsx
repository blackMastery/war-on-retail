import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn't find that page.</h1>
      <p className="mt-2 text-muted-foreground">It may have moved, or the link may be wrong.</p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 font-semibold hover:opacity-90"
        >
          Back home
        </Link>
        <Link
          href="/categories"
          className="rounded-md border border-border px-4 py-2 font-semibold text-secondary-foreground hover:bg-muted"
        >
          Browse categories
        </Link>
      </div>
    </main>
  );
}
