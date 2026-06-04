import Link from 'next/link';
import Image from 'next/image';
import { createAdminClient } from '@/lib/supabase/admin';
import Pagination from '@/components/customer/Pagination';
import { paginate, parsePage } from '@/lib/pagination';
import DeleteButton from './DeleteButton';

export const metadata = { title: 'Admin · Promotions' };

// Slightly smaller page than the public lists — 3-col card grid × 4 rows.
const PROMO_PAGE_SIZE = 12;

function statusLabel(p: {
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
}): { label: string; tone: 'green' | 'gray' | 'orange' | 'red' } {
  if (!p.is_active) return { label: 'Inactive', tone: 'gray' };
  const now = Date.now();
  if (p.starts_at && new Date(p.starts_at).getTime() > now) {
    return { label: 'Scheduled', tone: 'orange' };
  }
  if (p.ends_at && new Date(p.ends_at).getTime() < now) {
    return { label: 'Expired', tone: 'red' };
  }
  return { label: 'Live', tone: 'green' };
}

const toneClass: Record<'green' | 'gray' | 'orange' | 'red', string> = {
  green: 'bg-green-100 text-green-800',
  gray: 'bg-gray-100 text-gray-600',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-700',
};

export default async function AdminPromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page } = await searchParams;
  const requestedPage = parsePage(page);
  const offset = (requestedPage - 1) * PROMO_PAGE_SIZE;

  const supabase = createAdminClient();
  const { data: promotions, count } = await supabase
    .from('promotions')
    .select('*', { count: 'exact' })
    .order('is_featured', { ascending: false })
    .order('display_order')
    .order('created_at', { ascending: false })
    .range(offset, offset + PROMO_PAGE_SIZE - 1);

  const pag = paginate({
    requestedPage,
    count,
    rows: promotions ?? [],
    pageSize: PROMO_PAGE_SIZE,
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Promotions</h1>
          <p className="mt-1 text-sm text-gray-600">
            Images shown on the homepage when at least one is live. Featured = takes the large slot.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:shrink-0">
          <a
            href="https://github.com/kevoncadogan/war-on-retail/blob/main/docs/promotion-images.md"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Image guide ↗
          </a>
          <Link
            href="/admin/promotions/new"
            className="rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            + New promotion
          </Link>
        </div>
      </header>

      <details className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900 ring-1 ring-blue-200 open:pb-4">
        <summary className="cursor-pointer font-semibold">
          Quick reference: image specs &amp; link targets
        </summary>
        <div className="mt-2 space-y-2">
          <p className="font-semibold">Image</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              <strong>Featured</strong> (large slot): <strong>2000 × 1250 px</strong>, 16:10 ratio,
              ≤ 400 KB
            </li>
            <li>
              <strong>Side tiles</strong>: <strong>1200 × 750 px</strong>, 16:10 ratio, ≤ 200 KB
            </li>
            <li>Keep text and faces in the centre 80 % — edges may be cropped on phones</li>
            <li>WebP preferred; JPEG fine. Avoid portrait orientation.</li>
          </ul>
          <p className="font-semibold">Link to</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Internal page → paste the path: <code>/products/your-slug</code>,{' '}
              <code>/categories/televisions</code>, <code>/deals</code>
            </li>
            <li>
              External URL → full <code>https://…</code> (opens in a new tab automatically)
            </li>
            <li>Leave blank for a display-only banner</li>
          </ul>
        </div>
      </details>

      {(!promotions || promotions.length === 0) && (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-lg font-semibold text-gray-900">No promotions yet</p>
          <p className="mt-1 text-sm text-gray-600">
            Create one to show it on the homepage.
          </p>
        </div>
      )}

      {promotions && promotions.length > 0 && (
        <p className="text-sm text-gray-600 tabular-nums">
          {pag.count <= pag.pageSize
            ? `${pag.count} promotion${pag.count === 1 ? '' : 's'}`
            : `Showing ${pag.firstIdx}–${pag.lastIdx} of ${pag.count} promotions`}
        </p>
      )}

      {promotions && promotions.length > 0 && (
        <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {promotions.map((p) => {
            const s = statusLabel(p);
            return (
              <li
                key={p.id}
                className="overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-gray-200"
              >
                <div className="relative aspect-[16/9] bg-gray-100">
                  <Image
                    src={p.image_url}
                    alt={p.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                  />
                  {p.is_featured && (
                    <span className="absolute left-2 top-2 rounded bg-primary-600 px-2 py-0.5 text-xs font-bold text-white">
                      Featured
                    </span>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="line-clamp-2 font-semibold text-gray-900">{p.title}</h2>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[s.tone]}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {(p.starts_at || p.ends_at) && (
                    <p className="text-xs text-gray-500 tabular-nums">
                      {p.starts_at ? new Date(p.starts_at).toLocaleString() : '—'}
                      {' → '}
                      {p.ends_at ? new Date(p.ends_at).toLocaleString() : '—'}
                    </p>
                  )}
                  {p.link_url ? (
                    <p className="truncate text-xs text-gray-500">
                      <span aria-hidden="true">→ </span>
                      <span className="font-mono text-gray-700">{p.link_url}</span>
                    </p>
                  ) : (
                    <p className="text-xs italic text-gray-400">No link (display-only)</p>
                  )}
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <Link
                      href={`/admin/promotions/${p.id}/edit`}
                      className="font-medium text-primary-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <DeleteButton id={p.id} title={p.title} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery=""
        basePath="/admin/promotions"
      />
    </div>
  );
}
