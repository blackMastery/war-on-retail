import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import StarRating from '@/components/customer/StarRating';
import ReviewModerationActions from './ReviewModerationActions';
import type { ReviewStatus } from '@/types/database';

export const metadata = { title: 'Admin · Reviews' };

const STATUS_TONE: Record<ReviewStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-700',
};

const FILTERS: { value: ReviewStatus | 'all'; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const filter =
    statusParam === 'approved' || statusParam === 'rejected' || statusParam === 'all'
      ? statusParam
      : 'pending';

  const supabase = createAdminClient();

  let query = supabase
    .from('product_reviews')
    .select('id, rating, body, reviewer_name, status, created_at, product_id, user_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (filter !== 'all') {
    query = query.eq('status', filter);
  }

  const { data: reviews } = await query;
  const rows = reviews ?? [];

  const productIds = [...new Set(rows.map((r) => r.product_id))];
  const userIds = [...new Set(rows.map((r) => r.user_id))];

  const [{ data: products }, { data: customers }] = await Promise.all([
    productIds.length > 0
      ? supabase.from('products').select('id, name, slug').in('id', productIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    userIds.length > 0
      ? supabase.from('customers').select('user_id, name, email').in('user_id', userIds)
      : Promise.resolve({ data: [] as { user_id: string | null; name: string; email: string | null }[] }),
  ]);

  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  const customerByUserId = new Map(
    (customers ?? []).filter((c) => c.user_id).map((c) => [c.user_id as string, c]),
  );

  const pendingCount =
    filter === 'pending'
      ? rows.length
      : (
          await supabase
            .from('product_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pending')
        ).count ?? 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Product reviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Moderate verified customer reviews before they appear on product pages.
            {pendingCount > 0 && filter !== 'pending' && (
              <span className="ml-1 font-medium text-amber-700">{pendingCount} pending</span>
            )}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === 'pending' ? '/admin/reviews' : `/admin/reviews?status=${f.value}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              filter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-secondary'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="font-semibold text-foreground">No reviews in this queue</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'pending'
              ? 'New customer reviews will appear here for approval.'
              : 'Try another filter.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm ring-1 ring-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Customer</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Rating</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Review</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r) => {
                const product = productById.get(r.product_id);
                const customer = customerByUserId.get(r.user_id);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-4 py-3">
                      {product ? (
                        <Link
                          href={`/products/${product.slug}`}
                          className="font-medium text-link hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {product.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">Unknown product</span>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString()}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.reviewer_name}</p>
                      {customer?.email && (
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={r.rating} size="sm" />
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="line-clamp-4 whitespace-pre-wrap text-secondary-foreground">
                        {r.body}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_TONE[r.status as ReviewStatus]}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ReviewModerationActions
                        reviewId={r.id}
                        status={r.status as ReviewStatus}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
