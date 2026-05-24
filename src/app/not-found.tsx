import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="container flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn't find that page.</h1>
      <p className="mt-2 text-gray-600">It may have moved, or the link may be wrong.</p>
      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-md bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700"
        >
          Back home
        </Link>
        <Link
          href="/categories"
          className="rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          Browse categories
        </Link>
      </div>
    </main>
  );
}
