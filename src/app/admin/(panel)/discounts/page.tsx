import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import Pagination from '@/components/customer/Pagination';
import { paginate, parsePage } from '@/lib/pagination';
import { formatPrice } from '@/lib/utils';
import type { DiscountCode, DiscountType } from '@/types/database';
import DeleteButton from './DeleteButton';

export const metadata = { title: 'Admin · Discounts' };

const PAGE_SIZE = 20;

const TYPE_LABEL: Record<DiscountType, string> = {
  percentage: 'Percentage',
  fixed_amount: 'Fixed amount',
  bogo: 'BOGO',
};

/** How the discount value reads in the table, given its type. */
function valueLabel(d: DiscountCode): string {
  if (d.discount_type === 'fixed_amount') return formatPrice(d.discount_value);
  return `${d.discount_value}%`;
}

type Tone = 'green' | 'gray' | 'orange' | 'red';
const toneClass: Record<Tone, string> = {
  green: 'bg-green-100 text-green-800',
  gray: 'bg-muted text-muted-foreground',
  orange: 'bg-orange-100 text-orange-800',
  red: 'bg-red-100 text-red-700',
};

function statusLabel(d: DiscountCode): { label: string; tone: Tone } {
  if (!d.is_active) return { label: 'Inactive', tone: 'gray' };
  const now = Date.now();
  if (d.valid_from && new Date(d.valid_from).getTime() > now) {
    return { label: 'Scheduled', tone: 'orange' };
  }
  if (d.valid_until && new Date(d.valid_until).getTime() < now) {
    return { label: 'Expired', tone: 'red' };
  }
  if (d.usage_limit != null && d.usage_count >= d.usage_limit) {
    return { label: 'Used up', tone: 'red' };
  }
  return { label: 'Live', tone: 'green' };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card p-4 shadow-sm ring-1 ring-border">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

export default async function AdminDiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page, q } = await searchParams;
  const query = (q ?? '').trim();
  const requestedPage = parsePage(page);
  const offset = (requestedPage - 1) * PAGE_SIZE;

  const supabase = createAdminClient();

  // Stats span every code (unfiltered). The catalogue of codes is small, so a
  // single fetch is cheaper than four count/sum round-trips.
  const { data: allCodes } = await supabase
    .from('discount_codes')
    .select('is_active, usage_count, total_discount_given');
  const stats = {
    total: allCodes?.length ?? 0,
    active: allCodes?.filter((c) => c.is_active).length ?? 0,
    uses: allCodes?.reduce((s, c) => s + (c.usage_count ?? 0), 0) ?? 0,
    savings: allCodes?.reduce((s, c) => s + Number(c.total_discount_given ?? 0), 0) ?? 0,
  };

  // The (optionally filtered) paginated table.
  let listQuery = supabase
    .from('discount_codes')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });
  if (query) listQuery = listQuery.ilike('code', `%${query}%`);

  const { data: codes, count } = await listQuery.range(offset, offset + PAGE_SIZE - 1);

  const pag = paginate({ requestedPage, count, rows: codes ?? [], pageSize: PAGE_SIZE });
  const baseQuery = query ? `q=${encodeURIComponent(query)}` : '';

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold">Discount codes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Promo codes customers redeem at checkout. The order pipeline re-validates and
            records every redemption.
          </p>
        </div>
        <Link
          href="/admin/discounts/new"
          className="shrink-0 rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold hover:opacity-90"
        >
          + New code
        </Link>
      </header>

      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total codes" value={String(stats.total)} />
        <Stat label="Active codes" value={String(stats.active)} />
        <Stat label="Total uses" value={stats.uses.toLocaleString('en-GY')} />
        <Stat label="Total savings" value={formatPrice(stats.savings)} />
      </dl>

      <form method="get" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Search by code…"
          aria-label="Search discount codes"
          className="block w-full max-w-xs rounded-md border-border text-sm shadow-sm focus:border-ring focus:ring-ring"
        />
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-muted"
        >
          Search
        </button>
        {query && (
          <Link
            href="/admin/discounts"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-secondary-foreground"
          >
            Clear
          </Link>
        )}
      </form>

      {(!codes || codes.length === 0) && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="text-lg font-semibold text-foreground">
            {query ? 'No codes match your search' : 'No discount codes yet'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {query ? 'Try a different term.' : 'Create one to offer a promo at checkout.'}
          </p>
        </div>
      )}

      {codes && codes.length > 0 && (
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3">Code</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Value</th>
                <th scope="col" className="px-4 py-3 tabular-nums">Uses</th>
                <th scope="col" className="px-4 py-3 tabular-nums">Total savings</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {codes.map((d) => {
                const s = statusLabel(d);
                return (
                  <tr key={d.id} className="hover:bg-muted">
                    <td className="px-4 py-3">
                      <div className="font-mono font-semibold uppercase text-foreground">{d.code}</div>
                      {d.description && (
                        <div className="text-xs text-muted-foreground">{d.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-secondary-foreground">{TYPE_LABEL[d.discount_type]}</td>
                    <td className="px-4 py-3 tabular-nums text-secondary-foreground">{valueLabel(d)}</td>
                    <td className="px-4 py-3 tabular-nums text-secondary-foreground">
                      {d.usage_count}
                      {d.usage_limit != null ? ` / ${d.usage_limit}` : ''}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-secondary-foreground">
                      {formatPrice(Number(d.total_discount_given))}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${toneClass[s.tone]}`}
                      >
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/discounts/${d.id}/edit`}
                          className="font-medium text-primary hover:underline"
                        >
                          Edit
                        </Link>
                        <DeleteButton id={d.id} code={d.code} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={pag.currentPage}
        totalPages={pag.totalPages}
        baseQuery={baseQuery}
        basePath="/admin/discounts"
      />
    </div>
  );
}
