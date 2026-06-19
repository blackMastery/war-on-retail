/**
 * Loading UI for `/products/[slug]`.
 *
 * Mirrors the detail page's two-column layout: image gallery on the left,
 * buy panel on the right. Heights chosen to roughly match the real content
 * so the page doesn't jump much when the data arrives.
 */
export default function Loading() {
  return (
    <div className="container py-8">
      <div className="mb-4 h-4 w-64 animate-pulse rounded bg-muted" />

      <div className="grid animate-pulse gap-8 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-square w-full rounded-lg bg-muted" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-16 rounded bg-muted" />
            ))}
          </div>
        </div>

        {/* Detail */}
        <div>
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="mt-3 h-8 w-3/4 rounded bg-muted" />
          <div className="mt-2 h-3 w-20 rounded bg-muted" />
          <div className="mt-5 h-8 w-40 rounded bg-muted" />
          <div className="mt-4 h-4 w-full rounded bg-muted" />
          <div className="mt-2 h-4 w-5/6 rounded bg-muted" />

          <div className="mt-6 h-16 rounded-md bg-muted" />

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 rounded-md bg-muted" />
            ))}
          </div>

          <div className="mt-8 h-40 rounded-md bg-muted" />
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading product…
      </span>
    </div>
  );
}
